-- Fix RLS policies for aloa_project_knowledge table

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'aloa_project_knowledge';

-- 2. Check existing policies
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'aloa_project_knowledge';

-- 3. Disable RLS temporarily to test (we'll re-enable with proper policies)
ALTER TABLE aloa_project_knowledge DISABLE ROW LEVEL SECURITY;

-- 4. Test query to verify data is accessible
SELECT
  COUNT(*) as total_items,
  COUNT(CASE WHEN is_current = true THEN 1 END) as current_items
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a';

-- 5. Re-enable RLS with proper policies
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if any
DROP POLICY IF EXISTS "Public read access to knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Service role has full access" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Authenticated users can read knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Anyone can read project knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Service role can manage knowledge" ON aloa_project_knowledge;

-- 7. Create permissive read policy for all users (including anonymous)
CREATE POLICY "Anyone can read project knowledge"
ON aloa_project_knowledge
FOR SELECT
USING (true);

-- 8. Create write policy for service role only
CREATE POLICY "Service role can manage knowledge"
ON aloa_project_knowledge
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 9. Verify the policies are created
SELECT
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'aloa_project_knowledge';

-- 10. Final test - verify data is still accessible
SELECT
  COUNT(*) as final_count
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
AND is_current = true;