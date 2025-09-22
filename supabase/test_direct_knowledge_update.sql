-- Test script to verify we can update knowledge base fields directly
-- Run this in Supabase SQL editor to test the database side

-- 1. Check if the columns exist on aloa_projects
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'aloa_projects'
  AND column_name IN ('existing_url', 'google_drive_url', 'base_knowledge', 'knowledge_updated_at')
ORDER BY column_name;

-- 2. Check current values for the project
SELECT
  id,
  project_name,
  existing_url,
  google_drive_url,
  base_knowledge,
  knowledge_updated_at
FROM aloa_projects
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';

-- 3. Try a simple direct update (as superuser, bypassing all RLS)
UPDATE aloa_projects
SET
  google_drive_url = 'https://drive.google.com/test-direct-update',
  knowledge_updated_at = NOW()
WHERE id = '511306f6-0316-4a60-a318-1509d643238a'
RETURNING id, project_name, google_drive_url, knowledge_updated_at;

-- 4. Verify the update worked
SELECT
  id,
  project_name,
  existing_url,
  google_drive_url,
  base_knowledge,
  knowledge_updated_at
FROM aloa_projects
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';

-- 5. If the above works, the issue is with triggers or the API route
-- If it doesn't work, we need to check for database constraints or missing columns