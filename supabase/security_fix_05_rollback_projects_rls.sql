-- File: /supabase/security_fix_05_rollback_projects_rls.sql
-- Purpose: Roll back the changes from security_fix_05_enable_projects_rls.sql.

-- Remove custom policies to restore previous behavior
DROP POLICY IF EXISTS "Projects visible to members or admins" ON aloa_projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON aloa_projects;
DROP POLICY IF EXISTS "Admins can update projects" ON aloa_projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON aloa_projects;
DROP POLICY IF EXISTS "Service role bypass" ON aloa_projects;

-- Disable RLS
ALTER TABLE aloa_projects DISABLE ROW LEVEL SECURITY;

-- Restore broad grants (matches pre-fix open access)
GRANT ALL ON aloa_projects TO authenticated;
GRANT ALL ON aloa_projects TO anon;
GRANT ALL ON aloa_projects TO PUBLIC;

DO $$
BEGIN
  RAISE NOTICE 'aloa_projects RLS policies removed and broad access restored (use only for rollback).';
END $$;
