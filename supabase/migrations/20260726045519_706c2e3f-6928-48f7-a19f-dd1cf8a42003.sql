
DO $$
DECLARE
  _uid uuid;
  _org uuid;
  _email text := 'admin@meathub.com';
  _pw text := 'admin123456';
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = _email;

  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      _email, crypt(_pw, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name','Platform Admin'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), _uid, _uid::text,
            jsonb_build_object('sub', _uid::text, 'email', _email, 'email_verified', true),
            'email', now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(_pw, gen_salt('bf')),
                          email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = _uid;
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (_uid, _email, 'Platform Admin')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO _org FROM public.organizations
    WHERE type = 'INTERNAL' AND legal_name = 'SBMEAT Platform' LIMIT 1;

  IF _org IS NULL THEN
    INSERT INTO public.organizations (type, legal_name, display_name, status, approved_at, created_by)
    VALUES ('INTERNAL', 'SBMEAT Platform', 'SBMEAT Platform', 'APPROVED', now(), _uid)
    RETURNING id INTO _org;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (_org, _uid, 'platform_admin', 'ACTIVE')
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;
END $$;
