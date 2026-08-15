CREATE TYPE public.job_status AS ENUM ('diagnosed','quotes_requested','booked','in_progress','needs_verification','completed','cancelled');
CREATE TYPE public.verification_result AS ENUM ('not_started','pending','appears_completed','needs_manual_review','unable_to_verify');
CREATE TYPE public.quote_status AS ENUM ('pending','accepted','declined','withdrawn');
CREATE TYPE public.job_document_kind AS ENUM ('before_photo','after_photo','receipt','warranty','other');

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug text NOT NULL DEFAULT 'handyman',
  category_label text NOT NULL DEFAULT 'Handyman',
  problem_statement text NOT NULL DEFAULT '',
  scope_of_work text[] NOT NULL DEFAULT '{}',
  safety_steps text[] NOT NULL DEFAULT '{}',
  urgency text NOT NULL DEFAULT 'medium',
  estimated_minutes integer NOT NULL DEFAULT 60,
  expected_price_low numeric NOT NULL DEFAULT 0,
  expected_price_high numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  customer_note text NOT NULL DEFAULT '',
  service_address text NOT NULL DEFAULT '',
  preferred_date date,
  preferred_time text,
  ai_confidence numeric,
  ai_diagnosis jsonb,
  before_image_path text,
  after_image_path text,
  status public.job_status NOT NULL DEFAULT 'diagnosed',
  verification_status public.verification_result NOT NULL DEFAULT 'not_started',
  verification_note text,
  verified_at timestamptz,
  completed_at timestamptz,
  warranty_notes text,
  accepted_quote_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own jobs" ON public.service_requests
  FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

CREATE INDEX service_requests_customer_idx ON public.service_requests(customer_id, created_at DESC);
CREATE INDEX service_requests_status_idx ON public.service_requests(status);

ALTER TABLE public.bookings ADD COLUMN job_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL;
CREATE INDEX bookings_job_idx ON public.bookings(job_id);

CREATE POLICY "Providers view jobs they are booked for" ON public.service_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.job_id = service_requests.id AND b.provider_id = auth.uid())
  );

CREATE POLICY "Providers update jobs they are booked for" ON public.service_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.job_id = service_requests.id AND b.provider_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.job_id = service_requests.id AND b.provider_id = auth.uid())
  );

CREATE TABLE public.provider_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_name_snapshot text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  earliest_availability text NOT NULL DEFAULT '',
  included_work text[] NOT NULL DEFAULT '{}',
  warranty text NOT NULL DEFAULT '',
  notes text,
  status public.quote_status NOT NULL DEFAULT 'pending',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_quotes TO authenticated;
GRANT ALL ON public.provider_quotes TO service_role;
ALTER TABLE public.provider_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view quotes on own jobs" ON public.provider_quotes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.service_requests j WHERE j.id = provider_quotes.job_id AND j.customer_id = auth.uid())
  );

CREATE POLICY "Customers create quotes on own jobs" ON public.provider_quotes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.service_requests j WHERE j.id = provider_quotes.job_id AND j.customer_id = auth.uid())
  );

CREATE POLICY "Customers update quotes on own jobs" ON public.provider_quotes
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.service_requests j WHERE j.id = provider_quotes.job_id AND j.customer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.service_requests j WHERE j.id = provider_quotes.job_id AND j.customer_id = auth.uid())
  );

CREATE POLICY "Customers delete quotes on own jobs" ON public.provider_quotes
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.service_requests j WHERE j.id = provider_quotes.job_id AND j.customer_id = auth.uid())
  );

CREATE POLICY "Providers manage own quotes" ON public.provider_quotes
  FOR ALL TO authenticated USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

CREATE INDEX provider_quotes_job_idx ON public.provider_quotes(job_id, created_at DESC);

CREATE TABLE public.job_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.job_document_kind NOT NULL DEFAULT 'other',
  title text NOT NULL DEFAULT '',
  storage_path text,
  external_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_documents TO authenticated;
GRANT ALL ON public.job_documents TO service_role;
ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own job documents" ON public.job_documents
  FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Providers view documents on jobs they are booked for" ON public.job_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.job_id = job_documents.job_id AND b.provider_id = auth.uid())
  );

CREATE INDEX job_documents_job_idx ON public.job_documents(job_id, created_at DESC);

CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provider_quotes_updated_at BEFORE UPDATE ON public.provider_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_documents_updated_at BEFORE UPDATE ON public.job_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();