-- 1. Lead-capture tables stay insert-only for visitors: no reads/edits at all.
REVOKE SELECT, UPDATE, DELETE ON public.early_access FROM anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.provider_interest FROM anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.subscribers FROM anon, authenticated;

GRANT ALL ON public.early_access TO service_role;
GRANT ALL ON public.provider_interest TO service_role;
GRANT ALL ON public.subscribers TO service_role;

-- Explicit deny-by-default reads (documents intent alongside the revoked grants).
DROP POLICY IF EXISTS "No public read of early access" ON public.early_access;
CREATE POLICY "No public read of early access"
  ON public.early_access FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "No public read of provider interest" ON public.provider_interest;
CREATE POLICY "No public read of provider interest"
  ON public.provider_interest FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "No public read of subscribers" ON public.subscribers;
CREATE POLICY "No public read of subscribers"
  ON public.subscribers FOR SELECT TO anon, authenticated USING (false);

-- 2. Provider working hours: signed-in users only (booking requires sign-in).
DROP POLICY IF EXISTS "Availability is publicly viewable" ON public.provider_availability;
CREATE POLICY "Availability is viewable by signed-in users"
  ON public.provider_availability FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.provider_availability FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_availability TO authenticated;
GRANT ALL ON public.provider_availability TO service_role;

-- 3. Provider profiles: keep public listing columns, never the phone number.
REVOKE ALL ON public.provider_profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, business_name, service_category, service_area,
              starting_price, availability, bio, verification_status, service_zip,
              service_radius_miles, accepting_bookings, default_duration_minutes,
              travel_buffer_minutes, created_at, updated_at, interest_claimed_at)
  ON public.provider_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.provider_profiles TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;

-- 4. SECURITY DEFINER functions are not callable by anonymous visitors.
REVOKE ALL ON FUNCTION public.provider_busy_intervals(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_busy_intervals(uuid, timestamptz, timestamptz) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_provider_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_provider_profile() TO authenticated, service_role;

-- Trigger-only definer functions need no direct API access.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_booking_rules() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_time_off_rules() FROM PUBLIC, anon, authenticated;