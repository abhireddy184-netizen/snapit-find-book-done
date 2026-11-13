-- GetPros ProConnect: admin-only provider recruitment lead tracker.
-- No telephony: this schema only records leads, consent, do-not-call and
-- simulated or manually noted call history.

CREATE TABLE public.proconnect_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  category_slug text NOT NULL,
  city text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','es')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','no_answer','voicemail','interested','not_interested','follow_up','signed_up','do_not_call')),
  consent_status text NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('unknown','granted','revoked')),
  consent_source text,
  consent_at timestamptz,
  do_not_call boolean NOT NULL DEFAULT false,
  opted_out_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','provider_interest','demo')),
  is_demo boolean NOT NULL DEFAULT false,
  provider_interest_id uuid UNIQUE,
  signed_up_user_id uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proconnect_leads TO authenticated;
GRANT ALL ON public.proconnect_leads TO service_role;
ALTER TABLE public.proconnect_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ProConnect leads" ON public.proconnect_leads
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX proconnect_leads_status_idx ON public.proconnect_leads(status);
CREATE INDEX proconnect_leads_follow_up_idx ON public.proconnect_leads(next_follow_up_at);

-- Opt-out / DNC is sticky and forces the do_not_call status.
CREATE OR REPLACE FUNCTION public.proconnect_leads_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.consent_status = 'revoked' THEN
    NEW.do_not_call := true;
  END IF;
  IF NEW.do_not_call THEN
    NEW.status := 'do_not_call';
    NEW.next_follow_up_at := NULL;
    IF NEW.opted_out_at IS NULL THEN NEW.opted_out_at := now(); END IF;
  ELSIF NEW.status = 'do_not_call' THEN
    NEW.do_not_call := true;
    IF NEW.opted_out_at IS NULL THEN NEW.opted_out_at := now(); END IF;
  END IF;
  IF NEW.consent_status = 'granted' AND NEW.consent_at IS NULL THEN
    NEW.consent_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER proconnect_leads_guard_trg
  BEFORE INSERT OR UPDATE ON public.proconnect_leads
  FOR EACH ROW EXECUTE FUNCTION public.proconnect_leads_guard();

CREATE TABLE public.proconnect_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.proconnect_leads(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('simulation','manual_note')),
  outcome text NOT NULL CHECK (outcome IN ('no_answer','voicemail','interested','not_interested','follow_up','opted_out','note')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','es')),
  summary text NOT NULL DEFAULT '',
  follow_up_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.proconnect_call_logs TO authenticated;
GRANT ALL ON public.proconnect_call_logs TO service_role;
ALTER TABLE public.proconnect_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ProConnect call logs" ON public.proconnect_call_logs
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins add ProConnect call logs" ON public.proconnect_call_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete ProConnect call logs" ON public.proconnect_call_logs
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX proconnect_call_logs_lead_idx ON public.proconnect_call_logs(lead_id, created_at DESC);

-- Compliance gate: simulated calls are refused for DNC/opted-out leads and
-- for real (non-demo) leads without recorded consent. Outcomes update the lead.
CREATE OR REPLACE FUNCTION public.proconnect_call_log_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE l public.proconnect_leads;
BEGIN
  SELECT * INTO l FROM public.proconnect_leads WHERE id = NEW.lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NEW.kind = 'simulation' THEN
    IF l.do_not_call OR l.consent_status = 'revoked' THEN
      RAISE EXCEPTION 'This lead is on the do-not-call list';
    END IF;
    IF NOT l.is_demo AND l.consent_status <> 'granted' THEN
      RAISE EXCEPTION 'Consent is required before any call activity for a real lead';
    END IF;
  END IF;
  IF NEW.kind = 'manual_note' AND NEW.outcome <> 'note' AND NEW.outcome <> 'opted_out' THEN
    NEW.outcome := 'note';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER proconnect_call_log_guard_trg
  BEFORE INSERT ON public.proconnect_call_logs
  FOR EACH ROW EXECUTE FUNCTION public.proconnect_call_log_guard();

CREATE OR REPLACE FUNCTION public.proconnect_call_log_apply()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.outcome = 'opted_out' THEN
    UPDATE public.proconnect_leads
      SET do_not_call = true, consent_status = 'revoked', opted_out_at = COALESCE(opted_out_at, now())
      WHERE id = NEW.lead_id;
  ELSIF NEW.outcome <> 'note' THEN
    UPDATE public.proconnect_leads
      SET status = CASE NEW.outcome
            WHEN 'no_answer' THEN 'no_answer'
            WHEN 'voicemail' THEN 'voicemail'
            WHEN 'interested' THEN 'interested'
            WHEN 'not_interested' THEN 'not_interested'
            ELSE 'follow_up' END,
          next_follow_up_at = COALESCE(NEW.follow_up_at, next_follow_up_at)
      WHERE id = NEW.lead_id AND status NOT IN ('signed_up','do_not_call');
  ELSIF NEW.follow_up_at IS NOT NULL THEN
    UPDATE public.proconnect_leads SET next_follow_up_at = NEW.follow_up_at
      WHERE id = NEW.lead_id AND NOT do_not_call;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER proconnect_call_log_apply_trg
  AFTER INSERT ON public.proconnect_call_logs
  FOR EACH ROW EXECUTE FUNCTION public.proconnect_call_log_apply();

-- Compliance checklist (single row). Activation stays impossible here:
-- there is no telephony column and nothing reads this to place calls.
CREATE TABLE public.proconnect_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  tcpa_reviewed boolean NOT NULL DEFAULT false,
  dnc_registry_scrub boolean NOT NULL DEFAULT false,
  written_consent_capture boolean NOT NULL DEFAULT false,
  calling_hours_policy boolean NOT NULL DEFAULT false,
  ai_disclosure_script boolean NOT NULL DEFAULT false,
  recording_consent_policy boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.proconnect_settings TO authenticated;
GRANT ALL ON public.proconnect_settings TO service_role;
ALTER TABLE public.proconnect_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ProConnect settings" ON public.proconnect_settings
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins update ProConnect settings" ON public.proconnect_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.proconnect_settings (id) VALUES (true);

-- Import Pro-interest form submissions as leads (consent unknown) and
-- mark leads whose email now belongs to a registered Pro as signed up.
CREATE OR REPLACE FUNCTION public.proconnect_sync_leads()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE imported int := 0; converted int := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;

  INSERT INTO public.proconnect_leads
    (business_name, contact_name, phone, email, category_slug, city, source, provider_interest_id, notes)
  SELECT COALESCE(NULLIF(pi.business_name,''), pi.full_name), pi.full_name, pi.phone, pi.email,
         pi.category_slug, COALESCE(NULLIF(pi.city,''), pi.zip), 'provider_interest', pi.id,
         'Imported from Join-as-a-Pro form. Call consent not yet recorded.'
  FROM public.provider_interest pi
  ON CONFLICT (provider_interest_id) DO NOTHING;
  GET DIAGNOSTICS imported = ROW_COUNT;

  UPDATE public.proconnect_leads l
     SET signed_up_user_id = u.id,
         status = CASE WHEN l.do_not_call THEN l.status ELSE 'signed_up' END
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id AND p.is_provider
   WHERE l.signed_up_user_id IS NULL
     AND NOT l.is_demo
     AND l.email IS NOT NULL
     AND lower(u.email) = lower(trim(l.email));
  GET DIAGNOSTICS converted = ROW_COUNT;

  RETURN jsonb_build_object('imported', imported, 'converted', converted);
END $$;

REVOKE ALL ON FUNCTION public.proconnect_sync_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proconnect_sync_leads() TO authenticated;

-- Clearly-labelled demo leads (fictional names, 555 numbers) for simulation mode.
INSERT INTO public.proconnect_leads (business_name, contact_name, phone, category_slug, city, preferred_language, source, is_demo, consent_status, consent_source, notes) VALUES
 ('Demo Lone Star Plumbing', 'Sample Contact A', '(214) 555-0101', 'plumbing', 'Dallas', 'en', 'demo', true, 'granted', 'Demo data', 'DEMO — fictional business for simulation only.'),
 ('Demo Hermanos HVAC', 'Sample Contact B', '(817) 555-0102', 'hvac', 'Fort Worth', 'es', 'demo', true, 'granted', 'Demo data', 'DEMO — fictional business for simulation only.'),
 ('Demo Prairie Electric', 'Sample Contact C', '(972) 555-0103', 'electrical', 'Plano', 'en', 'demo', true, 'unknown', NULL, 'DEMO — fictional business for simulation only.'),
 ('Demo Sparkle Cleaning Co', 'Sample Contact D', '(469) 555-0104', 'cleaning', 'Frisco', 'es', 'demo', true, 'granted', 'Demo data', 'DEMO — fictional business for simulation only.'),
 ('Demo Arlington Handyman', 'Sample Contact E', '(682) 555-0105', 'handyman', 'Arlington', 'en', 'demo', true, 'revoked', 'Demo data', 'DEMO — fictional opted-out lead.');