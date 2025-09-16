-- Create the project-files storage bucket if it doesn't exist
-- Run this in the Supabase SQL editor

-- Insert the bucket (this will fail if it already exists, which is fine)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true, -- PUBLIC bucket for file access
  false,
  209715200, -- 200MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'video/mp4',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = true; -- Ensure it's public if it already exists

-- Create RLS policies for the bucket
CREATE POLICY "Public read access for project-files" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can upload to project-files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own files in project-files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own files in project-files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

-- Note: After running this, if you still get 400 errors, check:
-- 1. The bucket exists in Storage section of Supabase dashboard
-- 2. The bucket is set to PUBLIC (you may need to toggle this in the UI)
-- 3. Files are actually being uploaded (check Storage → project-files bucket)