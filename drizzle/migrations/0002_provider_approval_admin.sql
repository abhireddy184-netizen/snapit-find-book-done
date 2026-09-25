CREATE TYPE public.staff_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.staff_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.staff_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.staff_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.staff_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT COALESCE(current_setting('gpb.admin_verify', true), '') = 'on' THEN
    NEW.verification_status = OLD.verification_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_providers()
RETURNS TABLE (user_id uuid, business_name text, full_name text, email text, phone text,
  service_category text, service_area text, service_zip text, starting_price numeric, bio text,
  verification_status public.verification_status, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT pp.user_id, pp.business_name, p.full_name, u.email::text, COALESCE(pp.phone, p.phone),
         pp.service_category, pp.service_area, pp.service_zip, pp.starting_price, pp.bio,
         pp.verification_status, pp.created_at
    FROM public.provider_profiles pp
    LEFT JOIN public.profiles p ON p.id = pp.user_id
    LEFT JOIN auth.users u ON u.id = pp.user_id
   ORDER BY (pp.verification_status = 'verified'), pp.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_providers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_providers() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_provider_verification(_user_id uuid, _status public.verification_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM set_config('gpb.admin_verify', 'on', true);
  UPDATE public.provider_profiles SET verification_status = _status WHERE user_id = _user_id;
  PERFORM set_config('gpb.admin_verify', 'off', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_set_provider_verification(uuid, public.verification_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_verification(uuid, public.verification_status) TO authenticated;