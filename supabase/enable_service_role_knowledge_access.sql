-- Enable service role to work with knowledge extraction
-- This ensures the API can save knowledge base fields and trigger extraction

-- 1. Temporarily disable RLS on knowledge tables to allow service role access
ALTER TABLE aloa_project_knowledge DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_extraction_queue DISABLE ROW LEVEL SECURITY;

-- 2. Ensure the tables exist (in case they don't)
CREATE TABLE IF NOT EXISTS aloa_knowledge_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  metadata JSONB,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(project_id, source_type, source_id)
);

-- 3. Test the update with knowledge extraction
UPDATE aloa_projects
SET
  google_drive_url = 'https://drive.google.com/folders/test',
  knowledge_updated_at = NOW()
WHERE id = '511306f6-0316-4a60-a318-1509d643238a'
RETURNING id, project_name, google_drive_url, knowledge_updated_at;

-- 4. Check if the update worked
SELECT
  id,
  project_name,
  existing_url,
  google_drive_url,
  base_knowledge,
  knowledge_updated_at
FROM aloa_projects
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';

-- 5. IMPORTANT: Re-enable RLS but with proper policies
-- First enable RLS
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive policies for authenticated users (which includes service role)
-- For aloa_project_knowledge
DROP POLICY IF EXISTS authenticated_all ON aloa_project_knowledge;
CREATE POLICY authenticated_all ON aloa_project_knowledge
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- For aloa_knowledge_extraction_queue
DROP POLICY IF EXISTS authenticated_all ON aloa_knowledge_extraction_queue;
CREATE POLICY authenticated_all ON aloa_knowledge_extraction_queue
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Grant necessary permissions
GRANT ALL ON aloa_project_knowledge TO authenticated;
GRANT ALL ON aloa_knowledge_extraction_queue TO authenticated;

-- 8. Verify policies are in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('aloa_project_knowledge', 'aloa_knowledge_extraction_queue')
ORDER BY tablename, policyname;