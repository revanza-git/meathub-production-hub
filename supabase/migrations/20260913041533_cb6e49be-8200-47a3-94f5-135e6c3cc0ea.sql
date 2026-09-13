CREATE SCHEMA IF NOT EXISTS meatlink_private;

ALTER MATERIALIZED VIEW public.ml_catalog_analysis_cache SET SCHEMA meatlink_private;

GRANT USAGE ON SCHEMA meatlink_private TO anon, authenticated, service_role;
GRANT SELECT ON meatlink_private.ml_catalog_analysis_cache TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ml_public_catalog_analysis(
  _group_by text DEFAULT 'cut',
  _cut text DEFAULT NULL,
  _grade text DEFAULT NULL,
  _origin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, meatlink_private
AS $function$
  SELECT jsonb_set(
    payload,
    '{rows}',
    COALESCE(payload->'groups'->_group_by, '[]'::jsonb),
    true
  ) - 'groups'
  FROM meatlink_private.ml_catalog_analysis_cache
  WHERE filter_cut IS NOT DISTINCT FROM _cut
    AND filter_grade IS NOT DISTINCT FROM _grade
    AND filter_origin IS NOT DISTINCT FROM _origin
    AND _group_by IN ('cut', 'grade', 'origin')
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.ml_refresh_catalog_analysis_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, meatlink_private
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW meatlink_private.ml_catalog_analysis_cache;
  RETURN NULL;
END;
$function$;
