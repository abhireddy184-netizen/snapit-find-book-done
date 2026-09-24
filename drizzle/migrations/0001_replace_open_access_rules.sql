DROP POLICY IF EXISTS "Provider profiles are publicly viewable" ON public.provider_profiles;
CREATE POLICY "Verified provider profiles are publicly viewable" ON public.provider_profiles
  FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Provider services are publicly viewable" ON public.provider_services;
CREATE POLICY "Services of verified providers are publicly viewable" ON public.provider_services
  FOR SELECT TO anon, authenticated
  USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.user_id = provider_services.user_id AND p.verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS "Availability is viewable by signed-in users" ON public.provider_availability;
CREATE POLICY "Signed-in users see hours of bookable providers" ON public.provider_availability
  FOR SELECT TO authenticated
  USING (
    auth.uid() = provider_id OR EXISTS (
      SELECT 1 FROM public.provider_profiles p
      WHERE p.user_id = provider_availability.provider_id
        AND p.verification_status = 'verified'
        AND p.accepting_bookings = true
    )
  );

DROP POLICY IF EXISTS "Supported service zones are public reference data" ON public.us_zip3_zones;
CREATE POLICY "Valid US service zones are readable" ON public.us_zip3_zones
  FOR SELECT TO anon, authenticated
  USING (zip3 ~ '^[0-9]{3}$' AND (time_zone LIKE 'America/%' OR time_zone LIKE 'Pacific/%'));

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe with a valid email" ON public.subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND email_normalized = lower(trim(email))
    AND length(source) <= 64
  );

DROP POLICY IF EXISTS "Anyone can join early access" ON public.early_access;
CREATE POLICY "Anyone can join early access with valid details" ON public.early_access
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) BETWEEN 1 AND 120
    AND length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(location) <= 200
    AND length(service_interest) <= 200
    AND length(source) <= 64
  );

DROP POLICY IF EXISTS "Anyone can join the provider interest list" ON public.provider_interest;
CREATE POLICY "Anyone can join the provider interest list with valid details" ON public.provider_interest
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) BETWEEN 1 AND 120
    AND length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND zip ~ '^[0-9]{5}$'
    AND length(category_slug) BETWEEN 1 AND 80
    AND coalesce(length(note), 0) <= 2000
  );