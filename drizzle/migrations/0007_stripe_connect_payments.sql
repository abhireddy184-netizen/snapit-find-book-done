CREATE TYPE public.payment_status AS ENUM ('unpaid','method_saved','authorized','captured','partially_refunded','refunded','failed','canceled');

CREATE TABLE public.provider_payout_accounts (
  provider_id uuid PRIMARY KEY,
  stripe_account_id text NOT NULL UNIQUE,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_payout_accounts TO authenticated;
GRANT ALL ON public.provider_payout_accounts TO service_role;
ALTER TABLE public.provider_payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pros read own payout account" ON public.provider_payout_accounts FOR SELECT TO authenticated USING (auth.uid() = provider_id);

CREATE TABLE public.customer_billing (
  user_id uuid PRIMARY KEY,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_billing TO authenticated;
GRANT ALL ON public.customer_billing TO service_role;
ALTER TABLE public.customer_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own billing" ON public.customer_billing FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'full' CHECK (kind IN ('full','deposit','balance','cancellation_fee')),
  payment_intent_id text UNIQUE,
  amount_cents integer NOT NULL,
  fee_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  transfer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read booking payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())));

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_refund_id text UNIQUE,
  amount_cents integer NOT NULL,
  reason text,
  status text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read booking refunds" ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())));

CREATE TABLE public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_services ADD COLUMN price_cents integer CHECK (price_cents IS NULL OR price_cents > 0);

ALTER TABLE public.bookings
  ADD COLUMN subtotal_cents integer,
  ADD COLUMN service_fee_cents integer,
  ADD COLUMN platform_fee_cents integer,
  ADD COLUMN total_cents integer,
  ADD COLUMN currency text NOT NULL DEFAULT 'usd',
  ADD COLUMN quote_id uuid REFERENCES public.provider_quotes(id),
  ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN payment_method_id text,
  ADD COLUMN hold_scheduled_at timestamptz,
  ADD COLUMN customer_approved_at timestamptz,
  ADD COLUMN auto_capture_at timestamptz,
  ADD COLUMN payment_action_needed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_booking_money()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('anon','authenticated')
     OR auth.role() IN ('anon','authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subtotal_cents := NULL; NEW.service_fee_cents := NULL; NEW.platform_fee_cents := NULL;
      NEW.total_cents := NULL; NEW.payment_status := 'unpaid'; NEW.payment_method_id := NULL;
      NEW.customer_approved_at := NULL; NEW.auto_capture_at := NULL; NEW.hold_scheduled_at := NULL;
    ELSIF NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
       OR NEW.service_fee_cents IS DISTINCT FROM OLD.service_fee_cents
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
       OR NEW.payment_method_id IS DISTINCT FROM OLD.payment_method_id THEN
      RAISE EXCEPTION 'Payment fields can only be changed by GetPros';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_protect_money BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.protect_booking_money();

CREATE OR REPLACE FUNCTION public.lock_accepted_quote_price()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'accepted' AND NEW.price IS DISTINCT FROM OLD.price THEN
    RAISE EXCEPTION 'An accepted quote''s price can''t be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER provider_quotes_lock_price BEFORE UPDATE ON public.provider_quotes
FOR EACH ROW EXECUTE FUNCTION public.lock_accepted_quote_price();