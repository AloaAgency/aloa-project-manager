-- File: /supabase/security_fix_09_enable_projectlets_rls.sql
-- Purpose: Secure aloa_projectlets, aloa_projectlet_steps, and aloa_projectlet_step_comments.

ALTER TABLE aloa_projectlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_step_comments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_projectlets',
        'aloa_projectlet_steps',
        'aloa_projectlet_step_comments'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View projectlets in user projects" ON aloa_projectlets
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_projectlets.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage projectlets" ON aloa_projectlets
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projectlets
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View steps in user projectlets" ON aloa_projectlet_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlets p
      WHERE p.id = aloa_projectlet_steps.projectlet_id
        AND (
          is_project_member(p.project_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM aloa_project_stakeholders s
            WHERE s.project_id = p.project_id
              AND s.user_id = auth.uid()
          )
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage steps" ON aloa_projectlet_steps
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projectlet_steps
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View comments on accessible steps" ON aloa_projectlet_step_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlet_steps s
      JOIN aloa_projectlets p ON p.id = s.projectlet_id
      WHERE s.id = aloa_projectlet_step_comments.step_id
        AND (
          is_project_member(p.project_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM aloa_project_stakeholders st
            WHERE st.project_id = p.project_id
              AND st.user_id = auth.uid()
          )
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Project members can comment" ON aloa_projectlet_step_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_projectlet_steps s
      JOIN aloa_projectlets p ON p.id = s.projectlet_id
      WHERE s.id = aloa_projectlet_step_comments.step_id
        AND is_project_member(p.project_id, auth.uid())
    )
  );

CREATE POLICY "Service role bypass" ON aloa_projectlet_step_comments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE 'aloa_projectlets and related tables RLS configured.';
END $$;
