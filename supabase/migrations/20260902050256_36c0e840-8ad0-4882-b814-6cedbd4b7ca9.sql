-- 1. Buffer travel time is part of the booking record ------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 15;

-- Maintained by the trigger below: start_at .. end_at + travel buffer.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS occupied_end_at timestamptz;

UPDATE public.bookings
   SET occupied_end_at = end_at + make_interval(mins => buffer_minutes)
 WHERE end_at IS NOT NULL AND occupied_end_at IS NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_provider_overlap;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_provider_overlap
  EXCLUDE USING gist (
    provider_id WITH =,
    tstzrange(start_at, occupied_end_at, '[)') WITH &&
  )
  WHERE (
    provider_id IS NOT NULL AND start_at IS NOT NULL AND occupied_end_at IS NOT NULL
    AND status = ANY (ARRAY['pending'::booking_status,'confirmed'::booking_status,'in_progress'::booking_status])
  );

-- 2. Authoritative booking rules ---------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_booking_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  actor uuid := auth.uid();
  local_start timestamp;
  local_end timestamp;
  timing_changed boolean;
  dow int;
  start_min int;
  end_min int;
  prof record;
BEGIN
  IF NEW.start_at IS NOT NULL THEN
    NEW.end_at := NEW.start_at + make_interval(mins => NEW.duration_minutes);
    NEW.occupied_end_at := NEW.end_at + make_interval(mins => COALESCE(NEW.buffer_minutes, 0));
  ELSE
    NEW.occupied_end_at := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- New bookings are always a real request to a real pro, in the future.
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'A new booking must start as pending' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.provider_id IS NULL THEN
      RAISE EXCEPTION 'A booking must be assigned to a professional' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.start_at IS NULL OR NEW.service_timezone IS NULL THEN
      RAISE EXCEPTION 'A booking needs a start time and a service location timezone'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.start_at < now() + interval '60 minutes' THEN
      RAISE EXCEPTION 'Bookings need at least one hour of lead time' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.buffer_minutes < 0 OR NEW.buffer_minutes > 120 THEN
      RAISE EXCEPTION 'Travel buffer must be between 0 and 120 minutes' USING ERRCODE = 'check_violation';
    END IF;
    NEW.started_at := NULL;
    NEW.completed_at := NULL;
    NEW.cancelled_at := NULL;
    NEW.overran_window := false;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Identity of a booking is immutable.
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
       OR NEW.job_id IS DISTINCT FROM OLD.job_id THEN
      RAISE EXCEPTION 'The customer, professional and job of a booking cannot be changed'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  timing_changed := TG_OP = 'INSERT'
    OR NEW.start_at IS DISTINCT FROM OLD.start_at
    OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
    OR NEW.buffer_minutes IS DISTINCT FROM OLD.buffer_minutes
    OR NEW.service_timezone IS DISTINCT FROM OLD.service_timezone;

  IF NEW.start_at IS NOT NULL AND timing_changed THEN
    IF NEW.service_timezone IS NULL
       OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.service_timezone) THEN
      RAISE EXCEPTION 'A valid service location timezone is required to schedule a booking'
        USING ERRCODE = 'check_violation';
    END IF;

    local_start := NEW.start_at AT TIME ZONE NEW.service_timezone;
    local_end := NEW.end_at AT TIME ZONE NEW.service_timezone;

    IF local_start::time < TIME '08:00'
       OR local_end::time > TIME '20:00'
       OR local_end::date <> local_start::date THEN
      RAISE EXCEPTION 'GPB services run 8:00 AM to 8:00 PM local time; the whole job must fit inside that window'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.provider_id IS NOT NULL THEN
      dow := EXTRACT(dow FROM local_start)::int;
      start_min := EXTRACT(hour FROM local_start)::int * 60 + EXTRACT(minute FROM local_start)::int;
      end_min := EXTRACT(hour FROM local_end)::int * 60 + EXTRACT(minute FROM local_end)::int;

      SELECT accepting_bookings INTO prof
        FROM public.provider_profiles WHERE user_id = NEW.provider_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'That professional is not available on GPB' USING ERRCODE = 'check_violation';
      END IF;
      IF NOT prof.accepting_bookings THEN
        RAISE EXCEPTION 'This professional has paused new bookings' USING ERRCODE = 'check_violation';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.provider_availability a
         WHERE a.provider_id = NEW.provider_id
           AND a.weekday = dow
           AND a.start_minute <= start_min
           AND a.end_minute >= end_min
      ) THEN
        RAISE EXCEPTION 'This professional does not work at that time'
          USING ERRCODE = 'check_violation';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.provider_time_off t
         WHERE t.provider_id = NEW.provider_id
           AND tstzrange(t.starts_at, t.ends_at, '[)')
               && tstzrange(NEW.start_at, NEW.end_at + make_interval(mins => NEW.buffer_minutes), '[)')
      ) THEN
        RAISE EXCEPTION 'This professional is on time off then' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  -- Lifecycle. Only real transitions; no double start, no double complete.
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status IN ('confirmed', 'cancelled'))
      OR (OLD.status = 'confirmed'   AND NEW.status IN ('in_progress', 'cancelled'))
      OR (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Cannot move a booking from % to %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF actor IS NOT NULL THEN
      IF NEW.status IN ('confirmed', 'in_progress', 'completed')
         AND actor IS DISTINCT FROM OLD.provider_id THEN
        RAISE EXCEPTION 'Only the assigned professional can accept, start or complete this job'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF NEW.status = 'cancelled'
         AND actor IS DISTINCT FROM OLD.customer_id
         AND actor IS DISTINCT FROM OLD.provider_id THEN
        RAISE EXCEPTION 'Only the customer or the assigned professional can cancel this job'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;

    IF NEW.status = 'in_progress' THEN
      NEW.started_at := COALESCE(OLD.started_at, now());
    ELSIF NEW.status = 'completed' THEN
      NEW.completed_at := COALESCE(OLD.completed_at, now());
      IF NEW.end_at IS NOT NULL AND NEW.service_timezone IS NOT NULL
         AND (NEW.completed_at AT TIME ZONE NEW.service_timezone)::time > TIME '20:00' THEN
        NEW.overran_window := true;
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      NEW.cancelled_at := COALESCE(OLD.cancelled_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Provider phone numbers are not public -----------------------------------
REVOKE SELECT ON public.provider_profiles FROM anon;
REVOKE SELECT ON public.provider_profiles FROM authenticated;
GRANT SELECT (
  id, user_id, business_name, service_category, service_area, starting_price,
  availability, bio, verification_status, service_zip, service_radius_miles,
  accepting_bookings, default_duration_minutes, travel_buffer_minutes,
  created_at, updated_at
) ON public.provider_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.provider_profiles TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_provider_profile()
 RETURNS SETOF public.provider_profiles
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.provider_profiles WHERE user_id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_provider_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_provider_profile() TO authenticated;

-- 4. Time off: reasons private, busy ranges public ---------------------------
DROP POLICY IF EXISTS "Time off is publicly viewable" ON public.provider_time_off;
REVOKE SELECT ON public.provider_time_off FROM anon;

CREATE OR REPLACE FUNCTION public.provider_busy_intervals(
  _provider_id uuid,
  _from timestamptz,
  _to timestamptz
)
 RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT b.start_at, b.end_at + make_interval(mins => b.buffer_minutes)
    FROM public.bookings b
   WHERE b.provider_id = _provider_id
     AND b.start_at IS NOT NULL AND b.end_at IS NOT NULL
     AND b.status IN ('pending','confirmed','in_progress')
     AND b.start_at < _to
     AND b.end_at + make_interval(mins => b.buffer_minutes) > _from
  UNION ALL
  SELECT t.starts_at, t.ends_at
    FROM public.provider_time_off t
   WHERE t.provider_id = _provider_id
     AND t.starts_at < _to
     AND t.ends_at > _from;
$function$;

GRANT EXECUTE ON FUNCTION public.provider_busy_intervals(uuid, timestamptz, timestamptz)
  TO anon, authenticated;

-- 5. Atomic weekly hours replacement -----------------------------------------
CREATE OR REPLACE FUNCTION public.replace_provider_availability(_hours jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.provider_availability WHERE provider_id = uid;

  INSERT INTO public.provider_availability (provider_id, weekday, start_minute, end_minute)
  SELECT uid,
         (e->>'weekday')::smallint,
         GREATEST((e->>'startMinute')::int, 480),
         LEAST((e->>'endMinute')::int, 1200)
    FROM jsonb_array_elements(COALESCE(_hours, '[]'::jsonb)) e
   WHERE (e->>'weekday')::int BETWEEN 0 AND 6
     AND LEAST((e->>'endMinute')::int, 1200) > GREATEST((e->>'startMinute')::int, 480);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.replace_provider_availability(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_provider_availability(jsonb) TO authenticated;