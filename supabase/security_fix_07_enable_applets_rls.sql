-- File: /supabase/security_fix_07_enable_applets_rls.sql
-- Purpose: Secure aloa_applets and aloa_applet_progress tables with RLS
--          and align policies with the stakeholder-aware access model.

ALTER TABLE aloa_applets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_applet_progress ENABLE ROW LEVEL SECURITY;

-- Drop previous policies before recreating
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('aloa_applets', 'aloa_applet_progress')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Applets: visible to project members, stakeholders, or admins
CREATE POLICY "View applets in user projects" ON aloa_applets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM aloa_projectlets p
      WHERE p.id = aloa_applets.projectlet_id
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

CREATE POLICY "Admins manage applets" ON aloa_applets
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_applets
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Applet progress: users only see and mutate their own progress
CREATE POLICY "Users view own progress" ON aloa_applet_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text OR is_admin(auth.uid()));

CREATE POLICY "Users insert own progress" ON aloa_applet_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users modify own progress" ON aloa_applet_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Service role bypass" ON aloa_applet_progress
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE 'aloa_applets & aloa_applet_progress RLS configured.';
END $$;
