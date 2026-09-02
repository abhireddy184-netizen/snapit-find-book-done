CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------- profiles --
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS accepting_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS travel_buffer_minutes integer NOT NULL DEFAULT 15;

ALTER TABLE public.provider_profiles
  ADD CONSTRAINT provider_profiles_duration_ck CHECK (default_duration_minutes BETWEEN 15 AND 480) NOT VALID,
  ADD CONSTRAINT provider_profiles_buffer_ck CHECK (travel_buffer_minutes BETWEEN 0 AND 120) NOT VALID;

-- ------------------------------------------------------ weekly availability --
CREATE TABLE public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute integer NOT NULL CHECK (start_minute >= 480 AND start_minute < 1200),
  end_minute integer NOT NULL CHECK (end_minute > 480 AND end_minute <= 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_availability_order_ck CHECK (end_minute > start_minute),
  CONSTRAINT provider_availability_unique UNIQUE (provider_id, weekday, start_minute)
);

GRANT SELECT ON public.provider_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_availability TO authenticated;
GRANT ALL ON public.provider_availability TO service_role;

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is publicly viewable"
  ON public.provider_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Providers manage own availability"
  ON public.provider_availability FOR ALL TO authenticated
  USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------- time off --
CREATE TABLE public.provider_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_time_off_order_ck CHECK (ends_at > starts_at)
);

GRANT SELECT ON public.provider_time_off TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_time_off TO authenticated;
GRANT ALL ON public.provider_time_off TO service_role;

ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time off is publicly viewable"
  ON public.provider_time_off FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Providers manage own time off"
  ON public.provider_time_off FOR ALL TO authenticated
  USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

CREATE TRIGGER update_provider_time_off_updated_at
  BEFORE UPDATE ON public.provider_time_off
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX provider_time_off_provider_range_idx
  ON public.provider_time_off (provider_id, starts_at, ends_at);

-- ------------------------------------------------------- bookings: real time --
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS service_timezone text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS overran_window boolean NOT NULL DEFAULT false;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_duration_ck CHECK (duration_minutes BETWEEN 15 AND 480) NOT VALID;

-- Two jobs can never occupy the same pro at the same time. Applies only to
-- live, time-anchored bookings; legacy rows without start_at are untouched.
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_provider_overlap
  EXCLUDE USING gist (
    provider_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (
    provider_id IS NOT NULL
    AND start_at IS NOT NULL
    AND end_at IS NOT NULL
    AND status IN ('pending', 'confirmed', 'in_progress')
  );

-- ------------------------------------------------ platform window + lifecycle --
CREATE OR REPLACE FUNCTION public.enforce_booking_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  local_start timestamp;
  local_end timestamp;
  timing_changed boolean;
BEGIN
  IF NEW.start_at IS NOT NULL THEN
    NEW.end_at := NEW.start_at + make_interval(mins => NEW.duration_minutes);
  END IF;

  timing_changed := TG_OP = 'INSERT'
    OR NEW.start_at IS DISTINCT FROM OLD.start_at
    OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
    OR NEW.service_timezone IS DISTINCT FROM OLD.service_timezone;

  -- Platform service window: 8:00 AM - 8:00 PM in the SERVICE location's zone.
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

    -- Ownership: only the assigned pro runs the job; either side may cancel.
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
      -- A genuine job may run past 8 PM; record it truthfully instead of
      -- auto-completing or blocking the pro.
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
$$;

CREATE TRIGGER bookings_enforce_rules
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_rules();