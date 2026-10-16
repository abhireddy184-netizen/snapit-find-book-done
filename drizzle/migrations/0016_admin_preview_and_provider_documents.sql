
CREATE OR REPLACE FUNCTION public.admin_get_provider_preview(_user_id uuid)
RETURNS TABLE(user_id uuid, business_name text, service_category text, service_area text, service_zip text,
  service_radius_miles integer, starting_price numeric, bio text, default_duration_minutes integer,
  verification_status verification_status)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT p.user_id, p.business_name, p.service_category, p.service_area, p.service_zip,
    p.service_radius_miles, p.starting_price, p.bio, p.default_duration_minutes, p.verification_status
  FROM public.provider_profiles p WHERE p.user_id = _user_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_get_provider_preview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_provider_preview(uuid) TO authenticated;

CREATE TABLE public.provider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  doc_type text NOT NULL CHECK (doc_type IN ('business_registration','liability_insurance','trade_license','other')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.provider_documents TO authenticated;
GRANT ALL ON public.provider_documents TO service_role;
ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pros see own documents, admins see all" ON public.provider_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Pros add own pending documents" ON public.provider_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL
    AND admin_note IS NULL AND split_part(storage_path, '/', 1) = auth.uid()::text);
CREATE POLICY "Pros remove own pending documents" ON public.provider_documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');
CREATE INDEX provider_documents_user_idx ON public.provider_documents(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_review_provider_document(_id uuid, _status text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('pending','accepted','rejected') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE public.provider_documents
     SET status = _status, admin_note = NULLIF(left(coalesce(_note,''), 500), ''),
         reviewed_by = CASE WHEN _status = 'pending' THEN NULL ELSE auth.uid() END,
         reviewed_at = CASE WHEN _status = 'pending' THEN NULL ELSE now() END
   WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'document not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_review_provider_document(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_provider_document(uuid, text, text) TO authenticated;

CREATE TABLE public.provider_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  request_day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','suppressed','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (user_id, request_day)
);
GRANT SELECT ON public.provider_document_requests TO authenticated;
GRANT ALL ON public.provider_document_requests TO service_role;
ALTER TABLE public.provider_document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view document requests" ON public.provider_document_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Pros upload into own document folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-documents' AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('pdf','jpg','jpeg','png','webp'));
CREATE POLICY "Pros and admins read provider documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'provider-documents' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Pros delete own document files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'provider-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
