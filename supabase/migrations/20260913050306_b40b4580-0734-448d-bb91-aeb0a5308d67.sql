CREATE SCHEMA IF NOT EXISTS meatlink_private;
REVOKE ALL ON SCHEMA meatlink_private FROM PUBLIC;
GRANT USAGE ON SCHEMA meatlink_private TO anon, authenticated, service_role;

DO $migration$
DECLARE
  f record;
  wrapper_sql text;
  call_args text;
  volatility text;
  strictness text;
  public_exec boolean;
  anon_exec boolean;
  authenticated_exec boolean;
  service_exec boolean;
BEGIN
  CREATE TEMP TABLE functions_to_isolate ON COMMIT DROP AS
  SELECT
    p.oid,
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS identity_args,
    pg_get_function_arguments(p.oid) AS full_args,
    pg_get_function_result(p.oid) AS result_type,
    p.pronargs,
    p.provolatile,
    p.proisstrict,
    has_function_privilege('public', p.oid, 'EXECUTE') AS public_exec,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  FOR f IN SELECT * FROM functions_to_isolate ORDER BY proname, identity_args LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET SCHEMA meatlink_private',
      f.proname,
      f.identity_args
    );

    SELECT coalesce(string_agg(format('$%s', i), ', ' ORDER BY i), '')
      INTO call_args
      FROM generate_series(1, f.pronargs) AS i;

    volatility := CASE f.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END;
    strictness := CASE WHEN f.proisstrict THEN ' STRICT' ELSE '' END;

    IF f.result_type = 'void' THEN
      wrapper_sql := format(
        'CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql %s SECURITY INVOKER%s SET search_path = public, meatlink_private AS %L',
        f.proname,
        f.full_args,
        f.result_type,
        volatility,
        strictness,
        format('SELECT meatlink_private.%I(%s)', f.proname, call_args)
      );
    ELSE
      wrapper_sql := format(
        'CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql %s SECURITY INVOKER%s SET search_path = public, meatlink_private AS %L',
        f.proname,
        f.full_args,
        f.result_type,
        volatility,
        strictness,
        format('SELECT * FROM meatlink_private.%I(%s)', f.proname, call_args)
      );
    END IF;
    EXECUTE wrapper_sql;

    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated, service_role', f.proname, f.identity_args);
    EXECUTE format('REVOKE ALL ON FUNCTION meatlink_private.%I(%s) FROM PUBLIC, anon, authenticated, service_role', f.proname, f.identity_args);

    IF f.public_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO PUBLIC', f.proname, f.identity_args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION meatlink_private.%I(%s) TO PUBLIC', f.proname, f.identity_args);
    END IF;
    IF f.anon_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', f.proname, f.identity_args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION meatlink_private.%I(%s) TO anon', f.proname, f.identity_args);
    END IF;
    IF f.authenticated_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', f.proname, f.identity_args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION meatlink_private.%I(%s) TO authenticated', f.proname, f.identity_args);
    END IF;
    IF f.service_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', f.proname, f.identity_args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION meatlink_private.%I(%s) TO service_role', f.proname, f.identity_args);
    END IF;
  END LOOP;
END
$migration$;