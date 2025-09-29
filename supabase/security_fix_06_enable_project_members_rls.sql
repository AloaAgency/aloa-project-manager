-- File: /supabase/security_fix_06_enable_project_members_rls.sql
-- Purpose: Align aloa_project_members and aloa_project_stakeholders with the
--          security playbook, ensuring client users and stakeholders retain
--          access to their projects under RLS.

ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_stakeholders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on both tables so we can rebuild them cleanly
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('aloa_project_members', 'aloa_project_stakeholders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Project members visibility (includes stakeholders so client roles can view)
CREATE POLICY "View project members" ON aloa_project_members
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_members.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

-- Only admins (or service role via separate policy) can mutate membership
CREATE POLICY "Admins manage members" ON aloa_project_members
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_members
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Stakeholder visibility: stakeholders see themselves, members see teammates, admins see all
CREATE POLICY "View project stakeholders" ON aloa_project_stakeholders
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR user_id = auth.uid()
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage stakeholders" ON aloa_project_stakeholders
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_stakeholders
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE 'aloa_project_members & aloa_project_stakeholders RLS configured.';
END $$;
