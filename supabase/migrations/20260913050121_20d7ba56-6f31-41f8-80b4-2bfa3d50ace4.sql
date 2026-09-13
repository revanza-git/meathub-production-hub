GRANT SELECT ON TABLE public.ml_user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.ml_has_role(_user_id uuid, _role public.ml_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN auth.uid() = _user_id THEN EXISTS (
      SELECT 1 FROM public.ml_user_roles
      WHERE user_id = _user_id AND role = _role
    )
    WHEN EXISTS (
      SELECT 1 FROM public.ml_user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.ml_role
    ) THEN EXISTS (
      SELECT 1 FROM public.ml_user_roles
      WHERE user_id = _user_id AND role = _role
    )
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.ml_has_role(uuid, public.ml_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_has_role(uuid, public.ml_role) TO authenticated, service_role;