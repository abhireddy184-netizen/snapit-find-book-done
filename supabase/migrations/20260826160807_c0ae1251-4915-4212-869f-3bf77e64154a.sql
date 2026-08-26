ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS interest_claimed_at timestamptz;

ALTER TABLE public.provider_interest
  ADD COLUMN IF NOT EXISTS email_normalized text;

UPDATE public.provider_interest SET email_normalized = lower(trim(email)) WHERE email_normalized IS NULL;

CREATE INDEX IF NOT EXISTS provider_interest_email_normalized_idx ON public.provider_interest (email_normalized);