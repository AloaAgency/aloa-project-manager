-- File: /supabase/security_fix_12_enable_knowledge_rls.sql
-- Purpose: Secure aloa_project_knowledge and aloa_knowledge_form_responses.

ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_form_responses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_project_knowledge',
        'aloa_knowledge_form_responses'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View knowledge in user projects" ON aloa_project_knowledge
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_knowledge.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage knowledge" ON aloa_project_knowledge
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_knowledge
  FOR ALL
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR current_user = 'service_role'
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR current_user = 'service_role'
  );

CREATE POLICY "View knowledge responses" ON aloa_knowledge_form_responses
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_knowledge_form_responses.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage knowledge responses" ON aloa_knowledge_form_responses
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_knowledge_form_responses
  FOR ALL
  USING (
    (auth.jwt()->>'role' = 'service_role')
    OR current_user = 'service_role'
  )
  WITH CHECK (
    (auth.jwt()->>'role' = 'service_role')
    OR current_user = 'service_role'
  );

DO $$
BEGIN
  RAISE NOTICE 'Knowledge tables RLS configured.';
END $$;
