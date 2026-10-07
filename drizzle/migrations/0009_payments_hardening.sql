ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS category_slug text;

CREATE OR REPLACE FUNCTION public.protect_booking_money()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('anon','authenticated')
     OR auth.role() IN ('anon','authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subtotal_cents := NULL; NEW.service_fee_cents := NULL; NEW.platform_fee_cents := NULL;
      NEW.total_cents := NULL; NEW.payment_status := 'unpaid'; NEW.payment_method_id := NULL;
      NEW.customer_approved_at := NULL; NEW.auto_capture_at := NULL; NEW.hold_scheduled_at := NULL;
      NEW.quote_id := NULL; NEW.currency := 'usd'; NEW.payment_action_needed := false;
    ELSIF NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
       OR NEW.service_fee_cents IS DISTINCT FROM OLD.service_fee_cents
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
       OR NEW.payment_method_id IS DISTINCT FROM OLD.payment_method_id
       OR NEW.category_slug IS DISTINCT FROM OLD.category_slug THEN
      RAISE EXCEPTION 'Payment fields can only be changed by GetPros';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.enforce_booking_payout_ready()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_payout_accounts a
     WHERE a.provider_id = NEW.provider_id AND a.charges_enabled AND a.payouts_enabled
  ) THEN
    RAISE EXCEPTION 'This pro hasn''t finished setting up payments yet, so they can''t take bookings right now.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS bookings_payout_ready ON public.bookings;
CREATE TRIGGER bookings_payout_ready BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_payout_ready();