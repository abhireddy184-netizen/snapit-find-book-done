ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS service_zip text,
  ADD COLUMN IF NOT EXISTS service_radius_miles integer;

ALTER TABLE public.provider_profiles
  ADD CONSTRAINT provider_profiles_service_zip_format
  CHECK (service_zip IS NULL OR service_zip ~ '^[0-9]{5}$') NOT VALID;

ALTER TABLE public.provider_profiles
  ADD CONSTRAINT provider_profiles_service_radius_range
  CHECK (service_radius_miles IS NULL OR (service_radius_miles >= 1 AND service_radius_miles <= 200)) NOT VALID;

CREATE TABLE IF NOT EXISTS public.provider_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  zip text NOT NULL CHECK (zip ~ '^[0-9]{5}$'),
  city text CHECK (city IS NULL OR char_length(city) <= 120),
  state text CHECK (state IS NULL OR char_length(state) <= 2),
  category_slug text NOT NULL CHECK (char_length(category_slug) BETWEEN 1 AND 80),
  category_label text NOT NULL DEFAULT '' CHECK (char_length(category_label) <= 160),
  business_name text CHECK (business_name IS NULL OR char_length(business_name) <= 160),
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.provider_interest TO anon;
GRANT INSERT ON public.provider_interest TO authenticated;
GRANT ALL ON public.provider_interest TO service_role;

ALTER TABLE public.provider_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the provider interest list"
  ON public.provider_interest FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);