-- Create avatars storage bucket for user profile photos
-- This should be run in the Supabase SQL editor

-- Enable the storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit, owner)
VALUES
  (
    'avatars',
    'avatars',
    true,  -- Public bucket so avatars can be viewed
    false, -- No AVIF auto-detection
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[],
    5242880, -- 5MB max file size
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the avatars bucket

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Add comment to bucket
COMMENT ON TABLE storage.buckets IS 'Storage buckets for user-uploaded files';

-- Verify the bucket was created
SELECT id, name, public, allowed_mime_types, file_size_limit
FROM storage.buckets
WHERE name = 'avatars';