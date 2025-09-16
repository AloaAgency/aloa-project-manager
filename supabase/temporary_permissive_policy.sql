-- Temporary VERY permissive policy to allow testing
-- This will help us identify if the issue is with RLS or something else

-- 1. Disable RLS completely (temporarily for testing)
ALTER TABLE aloa_project_members DISABLE ROW LEVEL SECURITY;

-- This completely disables RLS on the table, allowing all operations
-- After testing, you can re-enable it with:
-- ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

-- 2. Verify RLS is disabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'aloa_project_members';

-- The rowsecurity column should show 'f' (false) indicating RLS is disabled