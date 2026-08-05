
-- Private, unguarded role lookup used only inside other SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public._role_check_internal(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND role = ANY(_roles) AND status = 'ACTIVE'
      AND (valid_to IS NULL OR valid_to > now()));
$$;

REVOKE ALL ON FUNCTION public._role_check_internal(uuid, public.app_role[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._caller_may_inspect(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL
      OR auth.uid() = _user_id
      OR public._role_check_internal(auth.uid(), ARRAY['hub_operator','courier','qc_officer','finance_operator','support','platform_admin','auditor']::public.app_role[]);
$$;

REVOKE ALL ON FUNCTION public._caller_may_inspect(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public._caller_may_inspect(_user_id)
    THEN public._role_check_internal(_user_id, ARRAY[_role]::public.app_role[])
    ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public._caller_may_inspect(_user_id)
    THEN public._role_check_internal(_user_id, _roles)
    ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.is_internal(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public._caller_may_inspect(_user_id)
    THEN public._role_check_internal(_user_id, ARRAY['hub_operator','courier','qc_officer','finance_operator','support','platform_admin','auditor']::public.app_role[])
    ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public._caller_may_inspect(_user_id)
    THEN EXISTS (SELECT 1 FROM public.organization_members
      WHERE user_id = _user_id AND organization_id = _org_id AND status = 'ACTIVE'
        AND (valid_to IS NULL OR valid_to > now()))
    ELSE false END;
$$;
