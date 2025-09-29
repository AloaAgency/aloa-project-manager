-- File: /supabase/security_fix_05_enable_projects_rls.sql
-- Purpose: Enable strict Row Level Security on aloa_projects and align with
--          the security playbook (enable RLS, revoke blanket grants, and
--          define explicit CRUD policies).
-- Notes:
--   * Idempotent: can be re-run safely.
--   * Depends on helper functions from security_fix_02_security_helpers.sql.

-- 1. Enable RLS on the table
ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;

-- 2. Revoke implicit privileges before re-granting precise access
REVOKE ALL ON aloa_projects FROM PUBLIC;
REVOKE ALL ON aloa_projects FROM anon;
REVOKE ALL ON aloa_projects FROM authenticated;

-- 3. Grant minimal required privileges back to application roles
GRANT SELECT, INSERT, UPDATE, DELETE ON aloa_projects TO authenticated;
GRANT ALL ON aloa_projects TO service_role;

-- 4. Drop existing policies so we can recreate clean versions
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aloa_projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_projects', pol.policyname);
  END LOOP;
END $$;

-- 5. SELECT policy: project members or admins only
CREATE POLICY "Projects visible to members or admins" ON aloa_projects
  FOR SELECT TO authenticated
  USING (
    is_project_member(id, auth.uid())
    OR EXISTS (
      SELECT 1
      FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_projects.id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

-- 6. INSERT policy: admins only
CREATE POLICY "Admins can insert projects" ON aloa_projects
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 7. UPDATE policy: admins only
CREATE POLICY "Admins can update projects" ON aloa_projects
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 8. DELETE policy: admins only
CREATE POLICY "Admins can delete projects" ON aloa_projects
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- 9. Service role bypass for system automations
CREATE POLICY "Service role bypass" ON aloa_projects
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 10. Helpful message when running manually
DO $$
BEGIN
  RAISE NOTICE 'aloa_projects RLS enabled with updated policies and grants.';
END $$;
