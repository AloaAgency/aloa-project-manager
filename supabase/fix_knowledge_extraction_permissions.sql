-- Fix permissions for knowledge extraction system
-- This allows the service role to properly access files for extraction

-- 1. Enable RLS on aloa_project_files if not already enabled
ALTER TABLE aloa_project_files ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for service role to read all files (for extraction)
CREATE POLICY "Service role can read all project files"
ON aloa_project_files
FOR SELECT
TO service_role
USING (true);

-- 3. Create policy for authenticated users to read files from their projects
CREATE POLICY "Users can read files from their projects"
ON aloa_project_files
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
);

-- 4. Create policy for authenticated users to insert files to their projects
CREATE POLICY "Users can upload files to their projects"
ON aloa_project_files
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
);

-- 5. Create policy for service role to do everything (for system operations)
CREATE POLICY "Service role has full access to project files"
ON aloa_project_files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Grant proper permissions on aloa_project_knowledge table
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;

-- 7. Allow service role to insert knowledge items
CREATE POLICY "Service role can manage all knowledge"
ON aloa_project_knowledge
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8. Allow authenticated users to read knowledge from their projects
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

-- 9. Grant necessary permissions to the tables
GRANT ALL ON aloa_project_files TO service_role;
GRANT SELECT, INSERT ON aloa_project_files TO authenticated;

GRANT ALL ON aloa_project_knowledge TO service_role;
GRANT SELECT ON aloa_project_knowledge TO authenticated;

GRANT ALL ON aloa_knowledge_extraction_queue TO service_role;
GRANT SELECT ON aloa_knowledge_extraction_queue TO authenticated;

-- 10. Create a function to manually trigger knowledge extraction for existing files
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

-- 11. Test by queuing extraction for your project
-- Uncomment and run this after creating the function:
-- SELECT extract_knowledge_from_existing_files('511306f6-0316-4a60-a318-1509d643238a');