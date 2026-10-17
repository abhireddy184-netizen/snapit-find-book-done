CREATE OR REPLACE FUNCTION public.save_provider_setup_for_user(_user_id uuid, _data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _s public.provider_setup; _name text; _phone text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 IF _user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_user_id AND (is_provider OR role='provider')) THEN RAISE EXCEPTION 'Providers only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text,7));
 INSERT INTO public.provider_setup(user_id) VALUES(_user_id) ON CONFLICT DO NOTHING;
 SELECT * INTO _s FROM public.provider_setup WHERE user_id=_user_id FOR UPDATE;
 IF _s.state <> 'pending_setup' OR EXISTS(SELECT 1 FROM public.provider_profiles WHERE user_id=_user_id AND verification_status IN ('pending','verified')) THEN RAISE EXCEPTION 'Setup is already submitted'; END IF;
 _name:=trim(COALESCE(_data->>'full_name','')); _phone:=trim(COALESCE(_data->>'phone',''));
 UPDATE public.provider_setup SET full_name=_name,phone=_phone,business_type=_data->>'business_type',trade_license_required=COALESCE((_data->>'trade_license_required')::boolean,false),category_slugs=ARRAY(SELECT jsonb_array_elements_text(_data->'category_slugs')),service_slugs=ARRAY(SELECT jsonb_array_elements_text(_data->'service_slugs')),updated_at=now() WHERE user_id=_user_id;
 UPDATE public.profiles SET full_name=_name,phone=_phone WHERE id=_user_id;
 INSERT INTO public.provider_profiles(user_id,business_name,service_category,service_area,service_zip,service_radius_miles,phone,bio)
 VALUES(_user_id,COALESCE(_data->>'business_name',''),_data->>'service_category',_data->>'service_area',NULLIF(_data->>'service_zip',''),(_data->>'service_radius_miles')::integer,_phone,_data->>'bio')
 ON CONFLICT(user_id) DO UPDATE SET business_name=EXCLUDED.business_name,service_category=EXCLUDED.service_category,service_area=EXCLUDED.service_area,service_zip=EXCLUDED.service_zip,service_radius_miles=EXCLUDED.service_radius_miles,phone=EXCLUDED.phone,bio=EXCLUDED.bio;
END; $$;
REVOKE ALL ON FUNCTION public.save_provider_setup_for_user(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_provider_setup_for_user(uuid,jsonb) TO service_role;
COMMENT ON FUNCTION public.save_my_provider_setup(jsonb) IS 'DEPRECATED: use server-bound save_provider_setup_for_user; never grant client execute';
REVOKE ALL ON FUNCTION public.save_my_provider_setup(jsonb) FROM PUBLIC,anon,authenticated;
ALTER TABLE public.provider_onboarding_emails ADD COLUMN IF NOT EXISTS claim_token uuid;
CREATE OR REPLACE FUNCTION public.claim_provider_email(_user_id uuid,_kind text)
RETURNS TABLE(token uuid, attempt integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 RETURN QUERY UPDATE public.provider_onboarding_emails e SET status='sending',claimed_at=now(),claim_token=gen_random_uuid(),attempts=e.attempts+1
 WHERE e.user_id=_user_id AND e.kind=_kind AND e.attempts<6 AND (e.status IN ('pending','failed') OR (e.status='sending' AND e.claimed_at<now()-interval '10 minutes')) RETURNING e.claim_token,e.attempts;
END; $$;
REVOKE ALL ON FUNCTION public.claim_provider_email(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_provider_email(uuid,text) TO service_role;
COMMENT ON FUNCTION public.claim_provider_submission_email(uuid) IS 'DEPRECATED: claim_provider_email uses a fencing token and counts attempts at claim time';