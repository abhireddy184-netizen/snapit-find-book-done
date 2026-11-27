CREATE OR REPLACE FUNCTION public.submit_my_provider_setup()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid:=auth.uid(); _s public.provider_setup; _p public.provider_profiles; _missing text[]:='{}';
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
 IF (cardinality(_s.category_slugs)=0 OR cardinality(_s.service_slugs)=0) AND COALESCE(length(trim(_s.other_service_description)),0)<2 THEN _missing:=array_append(_missing,'Services'); END IF;
 IF _p.id IS NULL OR length(trim(_p.business_name))<2 THEN _missing:=array_append(_missing,'Business or professional name'); END IF;
 IF _p.service_zip IS NULL OR _p.service_zip !~ '^\d{5}$' THEN _missing:=array_append(_missing,'5-digit service ZIP'); END IF;
 IF COALESCE(length(trim(_p.service_area)),0)=0 THEN _missing:=array_append(_missing,'Service city'); END IF;
 IF _p.service_radius_miles IS NULL OR _p.service_radius_miles NOT BETWEEN 1 AND 200 THEN _missing:=array_append(_missing,'Service radius (1–200 miles)'); END IF;
 -- Credentials are optional for initial review, not a waiver of eligibility for particular work.
 IF cardinality(_missing)>0 THEN RETURN jsonb_build_object('submitted',false,'missing',to_jsonb(_missing)); END IF;
 UPDATE public.provider_setup SET state='under_verification',submitted_at=now(),updated_at=now() WHERE user_id=_uid;
 PERFORM set_config('gpb.admin_verify','on',true);
 UPDATE public.provider_profiles SET verification_status='pending' WHERE user_id=_uid;
 PERFORM set_config('gpb.admin_verify','off',true);
 INSERT INTO public.provider_onboarding_emails(user_id,kind,status) VALUES (_uid,'profile_submitted','pending') ON CONFLICT(user_id,kind) DO NOTHING;
 RETURN jsonb_build_object('submitted',true,'missing','[]'::jsonb);
END; $function$;
REVOKE ALL ON FUNCTION public.submit_my_provider_setup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_my_provider_setup() TO authenticated;