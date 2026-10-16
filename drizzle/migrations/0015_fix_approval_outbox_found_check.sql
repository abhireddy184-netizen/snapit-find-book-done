CREATE OR REPLACE FUNCTION public.admin_set_provider_verification(_user_id uuid, _status verification_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prev verification_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT verification_status INTO _prev FROM public.provider_profiles WHERE user_id = _user_id FOR UPDATE;
  PERFORM set_config('gpb.admin_verify', 'on', true);
  UPDATE public.provider_profiles SET verification_status = _status WHERE user_id = _user_id;
  PERFORM set_config('gpb.admin_verify', 'off', true);
  -- Durable outbox: a real admin change to verified queues one approval email (once per pro, ever).
  IF _prev IS NOT NULL AND _status = 'verified' AND _prev <> 'verified' THEN
    INSERT INTO public.provider_onboarding_emails (user_id, kind, status, attempts)
    VALUES (_user_id, 'approved', 'pending', 0)
    ON CONFLICT (user_id, kind) DO NOTHING;
  END IF;
END;
$function$;