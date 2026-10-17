CREATE TABLE public.provider_setup (
 user_id uuid PRIMARY KEY,
 full_name text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 business_type text NOT NULL DEFAULT 'individual',
 trade_license_required boolean NOT NULL DEFAULT false,
 category_slugs text[] NOT NULL DEFAULT '{}',
 service_slugs text[] NOT NULL DEFAULT '{}',
 state text NOT NULL DEFAULT 'pending_setup',
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT provider_setup_business_type CHECK (business_type IN ('individual','registered_business')),
 CONSTRAINT provider_setup_state CHECK (state IN ('pending_setup','under_verification'))
);
GRANT SELECT ON public.provider_setup TO authenticated;
GRANT ALL ON public.provider_setup TO service_role;
ALTER TABLE public.provider_setup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers read own setup, admins read all" ON public.provider_setup FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.save_my_provider_setup(_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s public.provider_setup; _name text; _phone text;
BEGIN
 IF _uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=_uid AND (is_provider OR role='provider')) THEN RAISE EXCEPTION 'Providers only' USING ERRCODE='insufficient_privilege'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text, 7));
 _name := trim(COALESCE(_data->>'full_name','')); _phone := trim(COALESCE(_data->>'phone',''));
 INSERT INTO public.provider_setup(user_id) VALUES (_uid) ON CONFLICT DO NOTHING;
 SELECT * INTO _s FROM public.provider_setup WHERE user_id=_uid FOR UPDATE;
 IF _s.state <> 'pending_setup' THEN RAISE EXCEPTION 'Setup is already submitted'; END IF;
 IF EXISTS(SELECT 1 FROM public.provider_profiles WHERE user_id=_uid AND verification_status='verified') THEN RAISE EXCEPTION 'Approved profiles are managed in the dashboard'; END IF;
 UPDATE public.provider_setup SET full_name=_name, phone=_phone, business_type=_data->>'business_type', trade_license_required=COALESCE((_data->>'trade_license_required')::boolean,false), category_slugs=ARRAY(SELECT jsonb_array_elements_text(_data->'category_slugs')), service_slugs=ARRAY(SELECT jsonb_array_elements_text(_data->'service_slugs')), updated_at=now() WHERE user_id=_uid;
 UPDATE public.profiles SET full_name=_name, phone=_phone WHERE id=_uid;
 INSERT INTO public.provider_profiles(user_id,business_name,service_category,service_area,service_zip,service_radius_miles,phone,bio)
 VALUES (_uid,COALESCE(_data->>'business_name',''),_data->>'service_category',_data->>'service_area',NULLIF(_data->>'service_zip',''),(_data->>'service_radius_miles')::integer,_phone,_data->>'bio')
 ON CONFLICT(user_id) DO UPDATE SET business_name=EXCLUDED.business_name,service_category=EXCLUDED.service_category,service_area=EXCLUDED.service_area,service_zip=EXCLUDED.service_zip,service_radius_miles=EXCLUDED.service_radius_miles,phone=EXCLUDED.phone,bio=EXCLUDED.bio;
END; $$;
REVOKE ALL ON FUNCTION public.save_my_provider_setup(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_provider_setup(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_my_provider_setup() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid:=auth.uid(); _s public.provider_setup; _p public.provider_profiles; _missing text[]:='{}'; _required text[]; _type text;
BEGIN
 IF _uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_uid AND (is_provider OR role='provider')) THEN RAISE EXCEPTION 'Providers only' USING ERRCODE='insufficient_privilege'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text, 7));
 SELECT * INTO _s FROM public.provider_setup WHERE user_id=_uid FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('submitted',false,'missing',jsonb_build_array('Save your setup first')); END IF;
 IF _s.state='under_verification' THEN RETURN jsonb_build_object('submitted',true,'missing','[]'::jsonb); END IF;
 SELECT * INTO _p FROM public.provider_profiles WHERE user_id=_uid FOR UPDATE;
 IF _p.verification_status='verified' THEN RETURN jsonb_build_object('submitted',false,'missing',jsonb_build_array('Profile already approved')); END IF;
 IF length(trim(_s.full_name))<2 THEN _missing:=array_append(_missing,'Name'); END IF;
 IF length(regexp_replace(_s.phone,'[^0-9]','','g'))<10 THEN _missing:=array_append(_missing,'Phone number'); END IF;
 IF cardinality(_s.category_slugs)=0 OR cardinality(_s.service_slugs)=0 THEN _missing:=array_append(_missing,'Services'); END IF;
 IF _p.id IS NULL OR length(trim(_p.business_name))<2 THEN _missing:=array_append(_missing,'Business or professional name'); END IF;
 IF _p.service_zip IS NULL OR _p.service_zip !~ '^\d{5}$' THEN _missing:=array_append(_missing,'5-digit service ZIP'); END IF;
 IF COALESCE(length(trim(_p.service_area)),0)=0 THEN _missing:=array_append(_missing,'Service city'); END IF;
 IF _p.service_radius_miles IS NULL OR _p.service_radius_miles NOT BETWEEN 1 AND 200 THEN _missing:=array_append(_missing,'Service radius (1–200 miles)'); END IF;
 _required:=ARRAY['liability_insurance'];
 IF _s.business_type='registered_business' THEN _required:=array_append(_required,'business_registration'); END IF;
 IF _s.trade_license_required THEN _required:=array_append(_required,'trade_license'); END IF;
 FOREACH _type IN ARRAY _required LOOP
  IF NOT EXISTS(SELECT 1 FROM public.provider_documents d JOIN storage.objects o ON o.bucket_id='provider-documents' AND o.name=d.storage_path WHERE d.user_id=_uid AND d.doc_type=_type AND d.status IN ('pending','accepted') AND d.size_bytes BETWEEN 1 AND 10485760 AND d.mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')) THEN _missing:=array_append(_missing,replace(_type,'_',' ')); END IF;
 END LOOP;
 IF cardinality(_missing)>0 THEN RETURN jsonb_build_object('submitted',false,'missing',to_jsonb(_missing)); END IF;
 UPDATE public.provider_setup SET state='under_verification',submitted_at=now(),updated_at=now() WHERE user_id=_uid;
 PERFORM set_config('gpb.admin_verify','on',true);
 UPDATE public.provider_profiles SET verification_status='pending' WHERE user_id=_uid;
 PERFORM set_config('gpb.admin_verify','off',true);
 INSERT INTO public.provider_onboarding_emails(user_id,kind,status) VALUES (_uid,'profile_submitted','pending') ON CONFLICT(user_id,kind) DO NOTHING;
 RETURN jsonb_build_object('submitted',true,'missing','[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.submit_my_provider_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_my_provider_setup() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_unified_setup_status() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.provider_setup WHERE user_id=NEW.user_id AND state='under_verification') AND NOT COALESCE(current_setting('gpb.admin_verify',true),'')='on' THEN
  NEW.business_name:=OLD.business_name; NEW.service_category:=OLD.service_category; NEW.service_area:=OLD.service_area; NEW.service_zip:=OLD.service_zip; NEW.service_radius_miles:=OLD.service_radius_miles;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER protect_unified_setup_status BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_unified_setup_status();