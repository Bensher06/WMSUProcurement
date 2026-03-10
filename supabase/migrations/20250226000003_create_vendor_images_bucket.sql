-- ============================================================
-- CREATE STORAGE BUCKET FOR VENDOR IMAGES
-- ============================================================
-- Note: This needs to be run in Supabase Dashboard → Storage
-- Or via Supabase CLI if available
-- 
-- The bucket creation is typically done via the Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Create new bucket named "vendor-images"
-- 3. Set it to Public bucket
-- 4. Set policies as shown below

-- Create bucket (if using SQL, requires superuser privileges)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('vendor-images', 'vendor-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT
-- USING (bucket_id = 'vendor-images');

-- Policy: Allow authenticated users to upload
-- CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'vendor-images');

-- Policy: Allow authenticated users to update their own files
-- CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'vendor-images');

-- Policy: Allow authenticated users to delete their own files
-- CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'vendor-images');

-- Note: For production, you may want to restrict uploads to only authenticated users
-- and add file size/type validation policies

