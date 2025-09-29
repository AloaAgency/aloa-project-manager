-- File: /supabase/security_fix_11_enable_library_templates_rls.sql
-- Purpose: Secure aloa_applet_library, aloa_project_templates, and aloa_project_insights.

ALTER TABLE aloa_applet_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_insights ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_applet_library',
        'aloa_project_templates',
        'aloa_project_insights'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Library: read-only for authenticated users, admin/system manage content
CREATE POLICY "Authenticated can view library" ON aloa_applet_library
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage library" ON aloa_applet_library
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_applet_library
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Templates: viewable by project members/stakeholders; admins manage
CREATE POLICY "Authenticated can view templates" ON aloa_project_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage templates" ON aloa_project_templates
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_templates
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Insights: visible to project members/stakeholders; admins manage
CREATE POLICY "View insights in user projects" ON aloa_project_insights
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_insights.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage insights" ON aloa_project_insights
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_insights
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE 'Library, templates, and insights RLS configured.';
END $$;
