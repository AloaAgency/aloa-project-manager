-- Fix RLS policies for project-files storage bucket
-- Run this in your Supabase SQL Editor

-- First, ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete files" ON storage.objects;

-- Create new policies for the project-files bucket

-- 1. Allow anyone to upload files (temporary - for testing)
-- You can restrict this later to authenticated users only
CREATE POLICY "Allow public uploads to project-files bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
);

-- 2. Allow anyone to view files in the bucket
CREATE POLICY "Allow public to view project-files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files'
);

-- 3. Allow anyone to update their own files
CREATE POLICY "Allow public to update project-files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files'
)
WITH CHECK (
  bucket_id = 'project-files'
);

-- 4. Allow anyone to delete files
CREATE POLICY "Allow public to delete project-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files'
);

-- Alternative: More restrictive policies (use these in production)
-- Uncomment these and comment out the above policies for production use

/*
-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload to project-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
);

-- Only authenticated users can view files
CREATE POLICY "Authenticated users can view project-files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
);

-- Only authenticated users can update files
CREATE POLICY "Authenticated users can update project-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
)
WITH CHECK (
  bucket_id = 'project-files'
);

-- Only authenticated users can delete files
CREATE POLICY "Authenticated users can delete project-files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
);
*/

-- Verify the bucket exists and check its settings
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'project-files';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';