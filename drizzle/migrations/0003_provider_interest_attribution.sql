ALTER TABLE public.provider_interest
  ADD COLUMN IF NOT EXISTS years_experience smallint CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 80)),
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS fbclid text;