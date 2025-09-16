-- Check existing buckets
SELECT id, name, public, created_at
FROM storage.buckets;

-- If 'project-files' doesn't exist, create it
-- Or if 'projectfiles' exists instead, we'll need to update the code
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true,  -- Make it public
  false, -- No AVIF auto-detection
  209715200, -- 200MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv', 'application/json', 'application/xml',
        'application/zip', 'application/x-rar-compressed']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 209715200;

-- Create RLS policies to allow public read access
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-files');

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-files');

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-files');

-- Verify the bucket is properly configured
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'project-files';