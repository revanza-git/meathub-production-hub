-- 1. Clamp signup metadata: admin can never be self-assigned
CREATE OR REPLACE FUNCTION public.ml_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requested text := lower(COALESCE(NULLIF(NEW.raw_user_meta_data->>'ml_role',''),'buyer'));
BEGIN
  IF _requested NOT IN ('buyer','vendor') THEN
    _requested := 'buyer';
  END IF;
  INSERT INTO public.ml_user_roles (user_id, role)
  VALUES (NEW.id, _requested::public.ml_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Audit log for role changes
CREATE TABLE IF NOT EXISTS public.ml_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  actor_user_id uuid,
  from_role public.ml_role,
  to_role public.ml_role NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ml_role_audit TO authenticated;
GRANT ALL ON public.ml_role_audit TO service_role;

ALTER TABLE public.ml_role_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read role audit" ON public.ml_role_audit;
CREATE POLICY "Admins read role audit" ON public.ml_role_audit
  FOR SELECT TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

-- 3. Admin-only role assignment RPC with lockout protection
CREATE OR REPLACE FUNCTION public.ml_set_user_role(_user_id uuid, _role public.ml_role, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from public.ml_role;
BEGIN
  IF NOT public.ml_has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;

  SELECT role INTO _from FROM public.ml_user_roles WHERE user_id = _user_id LIMIT 1;

  IF _user_id = auth.uid() AND _role <> 'admin' THEN
    RAISE EXCEPTION 'You cannot remove your own admin role';
  END IF;

  IF _from IS NULL THEN
    INSERT INTO public.ml_user_roles (user_id, role) VALUES (_user_id, _role);
  ELSIF _from = _role THEN
    RETURN;
  ELSE
    UPDATE public.ml_user_roles SET role = _role WHERE user_id = _user_id;
  END IF;

  INSERT INTO public.ml_role_audit (target_user_id, actor_user_id, from_role, to_role, reason)
  VALUES (_user_id, auth.uid(), _from, _role, _reason);
END;
$$;

REVOKE ALL ON FUNCTION public.ml_set_user_role(uuid, public.ml_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_set_user_role(uuid, public.ml_role, text) TO authenticated;

-- 4. Bootstrap the first admin
DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'cs@meatlink.id' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.ml_user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.ml_user_roles SET role = 'admin' WHERE user_id = _uid;
    INSERT INTO public.ml_role_audit (target_user_id, actor_user_id, from_role, to_role, reason)
    VALUES (_uid, NULL, NULL, 'admin', 'Bootstrap first admin');
  END IF;
END $$;