REVOKE EXECUTE ON FUNCTION public.save_my_provider_setup(jsonb) FROM authenticated;
CREATE OR REPLACE FUNCTION public.save_provider_setup_for_user(_user_id uuid, _data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',_user_id::text,true);
 PERFORM public.save_my_provider_setup(_data);
END; $$;
REVOKE ALL ON FUNCTION public.save_provider_setup_for_user(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_provider_setup_for_user(uuid,jsonb) TO service_role;
ALTER TABLE public.provider_onboarding_emails ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_provider_submission_email(_user_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _attempts integer;
BEGIN
 UPDATE public.provider_onboarding_emails SET status='sending',claimed_at=now() WHERE user_id=_user_id AND kind='profile_submitted' AND attempts<6 AND (status IN ('pending','failed') OR (status='sending' AND claimed_at<now()-interval '10 minutes')) RETURNING attempts INTO _attempts;
 RETURN _attempts;
END; $$;
REVOKE ALL ON FUNCTION public.claim_provider_submission_email(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_provider_submission_email(uuid) TO service_role;