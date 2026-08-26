CREATE TABLE public.early_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  email_normalized text NOT NULL,
  location text NOT NULL,
  city text,
  state text,
  zip text,
  service_interest text NOT NULL DEFAULT '',
  service_slug text,
  source text NOT NULL DEFAULT 'homepage_early_access',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX early_access_email_idx ON public.early_access (email_normalized);

GRANT INSERT ON public.early_access TO anon, authenticated;
GRANT ALL ON public.early_access TO service_role;

ALTER TABLE public.early_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join early access"
ON public.early_access FOR INSERT
TO anon, authenticated
WITH CHECK (true);