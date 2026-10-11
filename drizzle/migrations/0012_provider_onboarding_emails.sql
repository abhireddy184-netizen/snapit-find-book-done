CREATE TABLE public.provider_onboarding_emails (
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('welcome','reminder_48h')),
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  PRIMARY KEY (user_id, kind)
);
GRANT ALL ON public.provider_onboarding_emails TO service_role;
ALTER TABLE public.provider_onboarding_emails ENABLE ROW LEVEL SECURITY;