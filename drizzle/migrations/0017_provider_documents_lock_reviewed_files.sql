
DROP POLICY IF EXISTS "Pros delete own document files" ON storage.objects;
CREATE POLICY "Pros delete own pending document files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'provider-documents' AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (SELECT 1 FROM public.provider_documents d WHERE d.storage_path = storage.objects.name AND d.status <> 'pending'));
