ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_format CHECK (phone IS NULL OR (phone = btrim(phone) AND phone ~ '^\+?[0-9][0-9 ()-]{6,28}$' AND length(phone) BETWEEN 8 AND 30)) NOT VALID;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, phone)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;