CREATE OR REPLACE FUNCTION public.initialize_unified_pro_setup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.role='provider' AND EXISTS(SELECT 1 FROM auth.users WHERE id=NEW.id AND raw_user_meta_data->>'signup_flow'='unified_pro') THEN
  INSERT INTO public.provider_setup(user_id,full_name,phone) SELECT NEW.id,NEW.full_name,COALESCE(raw_user_meta_data->>'phone','') FROM auth.users WHERE id=NEW.id ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER initialize_unified_pro_setup AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.initialize_unified_pro_setup();
CREATE OR REPLACE FUNCTION public.lock_submitted_setup_documents() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.provider_setup WHERE user_id=OLD.user_id AND state='under_verification') THEN RAISE EXCEPTION 'Submitted documents must be retained for review'; END IF;
 RETURN OLD;
END; $$;
CREATE TRIGGER lock_submitted_setup_documents BEFORE DELETE ON public.provider_documents FOR EACH ROW EXECUTE FUNCTION public.lock_submitted_setup_documents();
CREATE OR REPLACE FUNCTION public.can_remove_provider_document_file(_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT NOT EXISTS(SELECT 1 FROM public.provider_documents d WHERE d.storage_path=_name AND (d.status<>'pending' OR EXISTS(SELECT 1 FROM public.provider_setup s WHERE s.user_id=d.user_id AND s.state='under_verification')));
$$;
ALTER POLICY "Pros delete own pending document files" ON storage.objects USING(bucket_id='provider-documents' AND (storage.foldername(name))[1]=auth.uid()::text AND public.can_remove_provider_document_file(name));