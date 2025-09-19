-- Fix permissions for knowledge extraction system
-- This script drops existing policies and recreates them properly

-- 1. Drop existing policies on aloa_project_files
DROP POLICY IF EXISTS "Service role can read all project files" ON aloa_project_files;
DROP POLICY IF EXISTS "Service role has full access to project files" ON aloa_project_files;
DROP POLICY IF EXISTS "Users can read files from their projects" ON aloa_project_files;
DROP POLICY IF EXISTS "Users can upload files to their projects" ON aloa_project_files;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON aloa_project_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON aloa_project_files;
DROP POLICY IF EXISTS "Enable read access for all users" ON aloa_project_files;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON aloa_project_files;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON aloa_project_files;

-- 2. Enable RLS on aloa_project_files
ALTER TABLE aloa_project_files ENABLE ROW LEVEL SECURITY;

-- 3. Create new policies for aloa_project_files
-- Service role has full access (needed for knowledge extraction)
CREATE POLICY "Service role has full access to project files"
ON aloa_project_files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can manage files in their projects
CREATE POLICY "Users can manage files in their projects"
ON aloa_project_files
FOR ALL
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
);

-- Public users (anon) can read files marked as public
CREATE POLICY "Public can read public files"
ON aloa_project_files
FOR SELECT
TO anon
USING (is_public = true);

-- 4. Drop existing policies on aloa_project_knowledge
DROP POLICY IF EXISTS "Service role can manage all knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Users can read knowledge from their projects" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Enable read access for all users" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Enable insert for service role" ON aloa_project_knowledge;

-- 5. Enable RLS on aloa_project_knowledge
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;

-- 6. Create new policies for aloa_project_knowledge
-- Service role has full access (needed for extraction)
CREATE POLICY "Service role has full access to knowledge"
ON aloa_project_knowledge
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read knowledge from their projects
CREATE POLICY "Users can read knowledge from their projects"
ON aloa_project_knowledge
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
);

-- 7. Drop existing policies on aloa_knowledge_extraction_queue if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_knowledge_extraction_queue'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role has full access to queue" ON aloa_knowledge_extraction_queue';
    EXECUTE 'DROP POLICY IF EXISTS "Users can read queue for their projects" ON aloa_knowledge_extraction_queue';

    -- Enable RLS on the queue table
    EXECUTE 'ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY';

    -- Create policies for the queue
    EXECUTE 'CREATE POLICY "Service role has full access to queue" ON aloa_knowledge_extraction_queue FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Users can read queue for their projects" ON aloa_knowledge_extraction_queue FOR SELECT TO authenticated USING (project_id IN (SELECT project_id FROM aloa_project_members WHERE user_id = auth.uid()))';
  END IF;
END $$;

-- 8. Grant necessary permissions
GRANT ALL ON aloa_project_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON aloa_project_files TO authenticated;
GRANT SELECT ON aloa_project_files TO anon;

GRANT ALL ON aloa_project_knowledge TO service_role;
GRANT SELECT ON aloa_project_knowledge TO authenticated;

-- Grant on queue table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_knowledge_extraction_queue'
  ) THEN
    EXECUTE 'GRANT ALL ON aloa_knowledge_extraction_queue TO service_role';
    EXECUTE 'GRANT SELECT ON aloa_knowledge_extraction_queue TO authenticated';
  END IF;
END $$;

-- 9. Create or replace function to manually trigger knowledge extraction
CREATE OR REPLACE FUNCTION extract_knowledge_from_existing_files(p_project_id UUID)
RETURNS void AS $$
BEGIN
  -- Add all text files to extraction queue
  INSERT INTO aloa_knowledge_extraction_queue (
    project_id,
    source_type,
    source_id,
    metadata,
    status,
    priority
  )
  SELECT
    project_id,
    'file_document',
    id::text,
    jsonb_build_object(
      'file_name', file_name,
      'file_type', file_type,
      'file_id', id
    ),
    'pending',
    5
  FROM aloa_project_files
  WHERE project_id = p_project_id
    AND (
      file_type LIKE '%text%'
      OR file_type LIKE '%markdown%'
      OR file_name LIKE '%.md'
      OR file_name LIKE '%.txt'
      OR file_name LIKE '%.json'
    )
  ON CONFLICT (project_id, source_type, source_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION extract_knowledge_from_existing_files TO authenticated;
GRANT EXECUTE ON FUNCTION extract_knowledge_from_existing_files TO service_role;

-- 10. Verify the setup
SELECT
  'aloa_project_files' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'aloa_project_files'
UNION ALL
SELECT
  'aloa_project_knowledge' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'aloa_project_knowledge';

-- 11. Queue extraction for existing files (uncomment to run)
-- SELECT extract_knowledge_from_existing_files('511306f6-0316-4a60-a318-1509d643238a');