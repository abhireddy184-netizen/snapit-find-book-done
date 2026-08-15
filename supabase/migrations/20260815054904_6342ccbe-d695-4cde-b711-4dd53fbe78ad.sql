CREATE POLICY "Users read own job media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'job-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own job media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own job media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'job-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'job-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own job media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'job-media' AND (storage.foldername(name))[1] = auth.uid()::text);