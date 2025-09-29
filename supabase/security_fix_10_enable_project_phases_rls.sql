-- File: /supabase/security_fix_10_enable_project_phases_rls.sql
-- Purpose: Secure aloa_project_phases with stakeholder-aware RLS policies.

ALTER TABLE aloa_project_phases ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aloa_project_phases'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_project_phases', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "View phases in user projects" ON aloa_project_phases
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_phases.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage phases" ON aloa_project_phases
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_phases
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE 'aloa_project_phases RLS configured.';
END $$;
