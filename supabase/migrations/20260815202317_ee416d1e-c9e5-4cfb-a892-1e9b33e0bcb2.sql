CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  consent_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'website_footer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT subscribers_status_check CHECK (status IN ('active','unsubscribed','bounced')),
  CONSTRAINT subscribers_email_format_check CHECK (email_normalized ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

GRANT INSERT ON public.subscribers TO anon, authenticated;
GRANT ALL ON public.subscribers TO service_role;

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();