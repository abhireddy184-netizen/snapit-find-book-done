-- 1. Request-a-pro fields + previous status memory on jobs
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS preferred_window text;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS status_before_booking public.job_status;

-- 2. Link every booking to its AI brief
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL;
UPDATE public.bookings SET service_request_id = job_id WHERE service_request_id IS NULL AND job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_service_request_id_idx ON public.bookings(service_request_id);

CREATE OR REPLACE FUNCTION public.bookings_link_job()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.service_request_id := COALESCE(NEW.service_request_id, NEW.job_id);
    NEW.job_id := COALESCE(NEW.job_id, NEW.service_request_id);
    IF NEW.service_request_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.service_requests s WHERE s.id = NEW.service_request_id AND s.customer_id = NEW.customer_id
    ) THEN
      RAISE EXCEPTION 'That job brief does not belong to this customer' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF NEW.service_request_id IS DISTINCT FROM OLD.service_request_id THEN
    RAISE EXCEPTION 'The job brief of a booking cannot be changed' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bookings_link_job ON public.bookings;
CREATE TRIGGER bookings_link_job BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_link_job();

-- 3. Keep job status in sync with booking status
CREATE OR REPLACE FUNCTION public.sync_job_status_from_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE jid uuid := COALESCE(NEW.service_request_id, NEW.job_id);
BEGIN
  IF jid IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'confirmed' THEN
    UPDATE public.service_requests
       SET status_before_booking = COALESCE(status_before_booking, status), status = 'booked'
     WHERE id = jid;
  ELSIF NEW.status = 'in_progress' THEN
    UPDATE public.service_requests SET status = 'in_progress' WHERE id = jid;
  ELSIF NEW.status = 'completed' THEN
    UPDATE public.service_requests SET status = 'needs_verification', status_before_booking = NULL WHERE id = jid;
  ELSIF NEW.status = 'cancelled' THEN
    UPDATE public.service_requests
       SET status = COALESCE(status_before_booking, status), status_before_booking = NULL
     WHERE id = jid AND status_before_booking IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bookings_sync_job_status ON public.bookings;
CREATE TRIGGER bookings_sync_job_status AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_status_from_booking();
REVOKE EXECUTE ON FUNCTION public.sync_job_status_from_booking() FROM PUBLIC, anon, authenticated;

-- 4. Booking status changes only through server functions
DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Providers can update assigned bookings" ON public.bookings;
REVOKE UPDATE ON public.bookings FROM authenticated, anon;
GRANT ALL ON public.bookings TO service_role;

-- 5. Quotes: customers can no longer create quotes or write quote prices
DROP POLICY IF EXISTS "Customers create quotes on own jobs" ON public.provider_quotes;

CREATE OR REPLACE FUNCTION public.protect_quote_prices()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.provider_id IS DISTINCT FROM auth.uid() OR NEW.is_demo THEN
      RAISE EXCEPTION 'Only the pro who owns a quote can create it' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;
  IF auth.uid() IS DISTINCT FROM OLD.provider_id AND (
       NEW.price IS DISTINCT FROM OLD.price OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.included_work IS DISTINCT FROM OLD.included_work OR NEW.warranty IS DISTINCT FROM OLD.warranty
    OR NEW.earliest_availability IS DISTINCT FROM OLD.earliest_availability OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.provider_name_snapshot IS DISTINCT FROM OLD.provider_name_snapshot
    OR NEW.is_demo IS DISTINCT FROM OLD.is_demo OR NEW.job_id IS DISTINCT FROM OLD.job_id) THEN
    RAISE EXCEPTION 'Only the pro who owns a quote can change its price or terms' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF auth.uid() = OLD.provider_id AND (NEW.provider_id IS DISTINCT FROM OLD.provider_id OR NEW.is_demo IS DISTINCT FROM OLD.is_demo OR NEW.job_id IS DISTINCT FROM OLD.job_id) THEN
    RAISE EXCEPTION 'A quote cannot be moved to another pro or job' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS provider_quotes_protect_prices ON public.provider_quotes;
CREATE TRIGGER provider_quotes_protect_prices BEFORE INSERT OR UPDATE ON public.provider_quotes
  FOR EACH ROW EXECUTE FUNCTION public.protect_quote_prices();
GRANT ALL ON public.provider_quotes TO service_role;

-- 6. Job price estimates are set at creation and cannot be edited by clients afterwards
CREATE OR REPLACE FUNCTION public.protect_job_prices()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.expected_price_low IS DISTINCT FROM OLD.expected_price_low
     OR NEW.expected_price_high IS DISTINCT FROM OLD.expected_price_high
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.accepted_quote_id IS DISTINCT FROM OLD.accepted_quote_id AND NEW.accepted_quote_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.provider_quotes q WHERE q.id = NEW.accepted_quote_id AND q.job_id = NEW.id) THEN
    RAISE EXCEPTION 'Price fields can only be changed by GetPros' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS service_requests_protect_prices ON public.service_requests;
CREATE TRIGGER service_requests_protect_prices BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_job_prices();
GRANT ALL ON public.service_requests TO service_role;