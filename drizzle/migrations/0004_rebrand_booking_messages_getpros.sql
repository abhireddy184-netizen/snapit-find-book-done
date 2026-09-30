CREATE OR REPLACE FUNCTION public.enforce_booking_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor uuid := auth.uid();
  local_start timestamp;
  local_occupied_end timestamp;
  timing_changed boolean;
  revalidate boolean;
  dow int;
  start_min int;
  occupied_end_min int;
  prof record;
  resolved_zip text;
  resolved_zone text;
  lead_minutes constant int := 120;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF actor IS NOT NULL AND NEW.customer_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'You can only create bookings for your own account'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'A new booking must start as pending' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.provider_id IS NULL THEN
      RAISE EXCEPTION 'A booking must be assigned to a professional' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.start_at IS NULL THEN
      RAISE EXCEPTION 'A booking needs a start time' USING ERRCODE = 'check_violation';
    END IF;
    NEW.started_at := NULL;
    NEW.completed_at := NULL;
    NEW.cancelled_at := NULL;
    NEW.overran_window := false;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
       OR NEW.job_id IS DISTINCT FROM OLD.job_id THEN
      RAISE EXCEPTION 'The customer, professional and job of a booking cannot be changed'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.started_at IS DISTINCT FROM OLD.started_at
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR NEW.overran_window IS DISTINCT FROM OLD.overran_window THEN
      RAISE EXCEPTION 'Job progress timestamps are set by GetPros, not by the app'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
      RAISE EXCEPTION 'The request key of a booking cannot be changed' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  timing_changed := TG_OP = 'INSERT'
    OR NEW.start_at IS DISTINCT FROM OLD.start_at
    OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
    OR NEW.buffer_minutes IS DISTINCT FROM OLD.buffer_minutes
    OR NEW.service_address IS DISTINCT FROM OLD.service_address
    OR NEW.service_timezone IS DISTINCT FROM OLD.service_timezone;

  IF TG_OP = 'UPDATE' AND timing_changed THEN
    IF OLD.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION 'A % job cannot be rescheduled', replace(OLD.status::text, '_', ' ')
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.start_at IS NULL THEN
      RAISE EXCEPTION 'A booking needs a start time' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  revalidate := timing_changed
    OR (TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status = 'pending');

  IF NEW.start_at IS NOT NULL AND revalidate THEN
    IF NEW.start_at < now() + make_interval(mins => lead_minutes) THEN
      RAISE EXCEPTION 'Bookings need at least % hours of lead time', lead_minutes / 60
        USING ERRCODE = 'check_violation';
    END IF;

    resolved_zip := public.extract_service_zip(NEW.service_address);
    resolved_zone := public.service_zone_for_zip(resolved_zip);
    IF resolved_zone IS NULL THEN
      RAISE EXCEPTION 'GetPros only schedules at US service addresses inside the areas we support. Add a valid US ZIP code.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.service_timezone IS NOT NULL AND NEW.service_timezone <> resolved_zone THEN
      RAISE EXCEPTION 'The service location time zone does not match the service address'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.service_zip := resolved_zip;
    NEW.service_timezone := resolved_zone;

    SELECT accepting_bookings, verification_status, default_duration_minutes, travel_buffer_minutes
      INTO prof
      FROM public.provider_profiles WHERE user_id = NEW.provider_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That professional is not available on GetPros' USING ERRCODE = 'check_violation';
    END IF;
    IF prof.verification_status <> 'verified' THEN
      RAISE EXCEPTION 'This professional is not verified for bookings yet' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT prof.accepting_bookings THEN
      RAISE EXCEPTION 'This professional has paused new bookings' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.duration_minutes <> prof.default_duration_minutes
       OR NEW.buffer_minutes <> prof.travel_buffer_minutes THEN
      RAISE EXCEPTION 'The job length and travel buffer must match this professional''s settings'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.start_at IS NOT NULL THEN
    NEW.end_at := NEW.start_at + make_interval(mins => NEW.duration_minutes);
    NEW.occupied_end_at := NEW.end_at + make_interval(mins => COALESCE(NEW.buffer_minutes, 0));
  ELSE
    NEW.end_at := NULL;
    NEW.occupied_end_at := NULL;
  END IF;

  IF NEW.start_at IS NOT NULL AND revalidate THEN
    local_start := NEW.start_at AT TIME ZONE NEW.service_timezone;
    local_occupied_end := NEW.occupied_end_at AT TIME ZONE NEW.service_timezone;

    IF local_start::time < TIME '08:00'
       OR local_occupied_end::time > TIME '20:00'
       OR local_occupied_end::date <> local_start::date THEN
      RAISE EXCEPTION 'GetPros services run 8:00 AM to 8:00 PM local time; the job and its travel buffer must both fit inside that window'
        USING ERRCODE = 'check_violation';
    END IF;

    dow := EXTRACT(dow FROM local_start)::int;
    start_min := EXTRACT(hour FROM local_start)::int * 60 + EXTRACT(minute FROM local_start)::int;
    occupied_end_min := EXTRACT(hour FROM local_occupied_end)::int * 60
                      + EXTRACT(minute FROM local_occupied_end)::int;

    IF NOT EXISTS (
      SELECT 1 FROM public.provider_availability a
       WHERE a.provider_id = NEW.provider_id
         AND a.weekday = dow
         AND a.start_minute <= start_min
         AND a.end_minute >= occupied_end_min
    ) THEN
      RAISE EXCEPTION 'This professional does not work at that time'
        USING ERRCODE = 'check_violation';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_id::text, 42));

    IF EXISTS (
      SELECT 1 FROM public.provider_time_off t
       WHERE t.provider_id = NEW.provider_id
         AND tstzrange(t.starts_at, t.ends_at, '[)')
             && tstzrange(NEW.start_at, NEW.occupied_end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'This professional is on time off then' USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.provider_id = NEW.provider_id
         AND b.id <> NEW.id
         AND b.status IN ('pending', 'confirmed', 'in_progress')
         AND tstzrange(b.start_at, b.occupied_end_at, '[)')
             && tstzrange(NEW.start_at, NEW.occupied_end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'That time was just taken' USING ERRCODE = 'exclusion_violation';
    END IF;
  END IF;

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