-- Migration: Setup Storage Bucket for Prototype Files
-- Description: Creates and configures the prototype-files storage bucket with RLS policies
-- Date: 2025-11-05
--
-- NOTE: This must be run in the Supabase SQL Editor or through Supabase Storage UI
--
-- The storage bucket supports:
--   - Prototype images (PNG, JPG, JPEG, GIF, SVG, WebP)
--   - Screenshots from URL captures
--   - Direct image uploads
--   - Public read access for viewing
--   - Project-based write access control

-- =============================================================================
-- STORAGE BUCKET CREATION
-- =============================================================================

-- Note: Storage bucket creation must be done through Supabase Dashboard or API
-- These are the SQL policies that should be applied after bucket creation

/*
MANUAL SETUP STEPS:

1. Go to Supabase Dashboard > Storage
2. Click "New bucket"
3. Create bucket with these settings:
   - Name: prototype-files
   - Public bucket: YES (enable toggle)
   - File size limit: 50MB
   - Allowed MIME types:
     - image/png
     - image/jpeg
     - image/jpg
     - image/gif
     - image/svg+xml
     - image/webp

4. After creating, run the SQL policies below
*/

-- =============================================================================
-- STORAGE RLS POLICIES
-- =============================================================================

-- Note: These policies are created using Supabase's storage.objects table
-- Replace 'prototype-files' with your actual bucket name if different

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public can view prototype files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload prototype files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update prototype files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete prototype files" ON storage.objects;

-- Policy: Project members and admins can view prototype files
CREATE POLICY "Project members can view prototype files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'prototype-files'
  AND (
    -- Admins and team members
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'project_admin', 'team_member')
    )
    OR
    -- Project member (based on project ID in object path: {project_id}/...)
    EXISTS (
      SELECT 1 FROM aloa_project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id::text = SPLIT_PART(name, '/', 1)
    )
    OR
    -- Stakeholder
    EXISTS (
      SELECT 1 FROM aloa_project_stakeholders ps
      WHERE ps.user_id = auth.uid()
      AND ps.project_id::text = SPLIT_PART(name, '/', 1)
    )
  )
);

-- Policy: Project members and admins can upload prototype files
CREATE POLICY "Project members can upload prototype files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prototype-files'
  AND (
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'project_admin', 'team_member')
    )
    OR
    -- Check if user is project member (for the project in the path)
    EXISTS (
      SELECT 1 FROM aloa_project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id::text = SPLIT_PART(name, '/', 1)
    )
    OR
    -- Check if user is project stakeholder
    EXISTS (
      SELECT 1 FROM aloa_project_stakeholders ps
      WHERE ps.user_id = auth.uid()
      AND ps.project_id::text = SPLIT_PART(name, '/', 1)
    )
  )
);

-- Policy: Project members and admins can update their prototype files
CREATE POLICY "Project members can update prototype files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'prototype-files'
  AND (
    -- Check if user is admin
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'project_admin', 'team_member')
    )
    OR
    -- Check if user is project member
    EXISTS (
      SELECT 1 FROM aloa_project_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.project_id::text = SPLIT_PART(name, '/', 1)
    )
  )
);

-- Policy: Only admins can delete prototype files
CREATE POLICY "Admins can delete prototype files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'prototype-files'
  AND EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin')
  )
);

-- =============================================================================
-- FILE PATH STRUCTURE
-- =============================================================================

/*
Recommended file path structure for organizing prototype files:

/{project_id}/prototypes/{prototype_id}/{filename}

Example:
/550e8400-e29b-41d4-a716-446655440000/prototypes/123e4567-e89b-12d3-a456-426614174000/homepage-v1.png

This structure:
- Keeps files organized by project
- Allows RLS policies to check project membership
- Makes cleanup easier when deleting projects
- Supports multiple versions/iterations
*/

-- =============================================================================
-- HELPER FUNCTION: Get Public URL for Prototype Files
-- =============================================================================

CREATE OR REPLACE FUNCTION get_prototype_file_url(file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  -- Get the Supabase project URL from settings or environment
  -- This should be configured based on your Supabase project
  -- Replace with your actual Supabase URL
  supabase_url := current_setting('app.supabase_url', true);

  IF supabase_url IS NULL THEN
    -- Fallback: construct from standard pattern
    -- You should replace this with your actual Supabase project URL
    supabase_url := 'https://YOUR_PROJECT_REF.supabase.co';
  END IF;

  -- Construct the public URL for the file
  RETURN supabase_url || '/storage/v1/object/public/prototype-files/' || file_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_prototype_file_url IS 'Constructs public URL for files in prototype-files bucket';

-- =============================================================================
-- MIGRATION VERIFICATION
-- =============================================================================

DO $$
DECLARE
  policies_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Count storage policies for prototype-files bucket
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%prototype files%';

  -- Check if helper function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_prototype_file_url'
  ) INTO function_exists;

  -- Report results
  RAISE NOTICE '📊 Created % storage policies for prototype-files bucket', policies_count;

  IF function_exists THEN
    RAISE NOTICE '✅ Helper function get_prototype_file_url created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Manual steps required!';
  RAISE NOTICE '1. Create the "prototype-files" bucket in Supabase Dashboard > Storage';
  RAISE NOTICE '2. Set it as a PUBLIC bucket';
  RAISE NOTICE '3. Configure file size limit (recommended: 50MB)';
  RAISE NOTICE '4. Set allowed MIME types to image formats only';
  RAISE NOTICE '5. Run this SQL to apply the RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '📋 File upload paths should follow: /{project_id}/prototypes/{prototype_id}/{filename}';
END $$;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

/*
-- Example: Upload a prototype image via Supabase client (JavaScript)

const { data, error } = await supabase.storage
  .from('prototype-files')
  .upload(
    `${projectId}/prototypes/${prototypeId}/${fileName}`,
    file,
    {
      contentType: file.type,
      upsert: true
    }
  );

-- Example: Get public URL for a prototype image

const { data } = supabase.storage
  .from('prototype-files')
  .getPublicUrl(`${projectId}/prototypes/${prototypeId}/${fileName}`);

-- Example: List all prototype files for a project

const { data, error } = await supabase.storage
  .from('prototype-files')
  .list(`${projectId}/prototypes`, {
    limit: 100,
    offset: 0
  });
*/

-- =============================================================================
-- ROLLBACK SCRIPT (for reference - run manually if needed)
-- =============================================================================
/*
-- To rollback storage policies:

DROP POLICY IF EXISTS "Public can view prototype files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload prototype files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update prototype files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete prototype files" ON storage.objects;

DROP FUNCTION IF EXISTS get_prototype_file_url(TEXT);

-- Note: The bucket itself must be deleted through Supabase Dashboard
*/
