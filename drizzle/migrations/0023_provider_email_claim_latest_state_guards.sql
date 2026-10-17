CREATE OR REPLACE FUNCTION public.claim_provider_email(_user_id uuid,_kind text)
RETURNS TABLE(token uuid, attempt integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text,7));
 IF _kind IN ('reminder_24h','reminder_48h') AND (EXISTS(SELECT 1 FROM public.provider_setup WHERE user_id=_user_id AND state<>'pending_setup') OR EXISTS(SELECT 1 FROM public.provider_profiles WHERE user_id=_user_id AND verification_status IN ('pending','verified'))) THEN RETURN; END IF;
 IF _kind='approved' AND NOT EXISTS(SELECT 1 FROM public.provider_profiles WHERE user_id=_user_id AND verification_status='verified') THEN RETURN; END IF;
 IF _kind='profile_submitted' AND EXISTS(SELECT 1 FROM public.provider_setup WHERE user_id=_user_id) AND NOT EXISTS(SELECT 1 FROM public.provider_setup WHERE user_id=_user_id AND state='under_verification' AND submitted_at IS NOT NULL) THEN RETURN; END IF;
 RETURN QUERY UPDATE public.provider_onboarding_emails e SET status='sending',claimed_at=now(),claim_token=gen_random_uuid(),attempts=e.attempts+1
 WHERE e.user_id=_user_id AND e.kind=_kind AND e.attempts<6 AND (e.status IN ('pending','failed') OR (e.status='sending' AND e.claimed_at<now()-interval '10 minutes')) RETURNING e.claim_token,e.attempts;
END; $$;
REVOKE ALL ON FUNCTION public.claim_provider_email(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_provider_email(uuid,text) TO service_role;