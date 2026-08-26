-- 1) Universal identity fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS is_provider boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_since timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_e164_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_e164_format
  CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

-- One phone number can only belong to one account (blank/null stays allowed)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_unique
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- 2) Backfill provider capability from existing data (additive, non-destructive)
UPDATE public.profiles p
SET is_provider = true,
    provider_since = COALESCE(p.provider_since, p.created_at)
WHERE p.is_provider = false
  AND (p.role = 'provider'::public.app_role
       OR EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = p.id));

-- 3) Multiple services per provider account
CREATE TABLE IF NOT EXISTS public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug text NOT NULL,
  category_label text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT SELECT ON public.provider_services TO anon;
GRANT ALL ON public.provider_services TO service_role;

ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider services are publicly viewable" ON public.provider_services;
CREATE POLICY "Provider services are publicly viewable"
  ON public.provider_services FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Providers manage own services" ON public.provider_services;
CREATE POLICY "Providers manage own services"
  ON public.provider_services FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_provider_services_updated_at ON public.provider_services;
CREATE TRIGGER update_provider_services_updated_at
  BEFORE UPDATE ON public.provider_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Preserve the existing primary category as the first service
INSERT INTO public.provider_services (user_id, category_slug, category_label, is_primary)
SELECT pp.user_id, pp.service_category, pp.service_category, true
FROM public.provider_profiles pp
WHERE pp.service_category IS NOT NULL AND pp.service_category <> ''
ON CONFLICT (user_id, category_slug) DO NOTHING;

-- 5) New signups: keep role for compatibility, set capability additively
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_provider, provider_since)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN NEW.raw_user_meta_data ->> 'role' = 'provider' THEN 'provider'::public.app_role
         ELSE 'customer'::public.app_role END,
    COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'provider',
    CASE WHEN NEW.raw_user_meta_data ->> 'role' = 'provider' THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;