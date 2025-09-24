-- File: /supabase/05_rollback_projects_rls.sql
-- EMERGENCY ROLLBACK for aloa_projects RLS
-- Only use this if enabling RLS on aloa_projects breaks functionality

-- Disable RLS on aloa_projects table
ALTER TABLE aloa_projects DISABLE ROW LEVEL SECURITY;

-- Verify rollback
SELECT
  CASE
    WHEN NOT rowsecurity THEN '✓ RLS has been DISABLED on aloa_projects (rollback successful)'
    ELSE '✗ RLS is still enabled on aloa_projects'
  END as rollback_status
FROM pg_tables
WHERE tablename = 'aloa_projects';

-- Note: Policies remain in place but are inactive when RLS is disabled
-- They will reactivate if RLS is re-enabled later

RAISE NOTICE 'Rollback complete. RLS disabled on aloa_projects table.';
RAISE NOTICE 'Note: This is a temporary fix. The table should have RLS enabled for security.';