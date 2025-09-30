-- File: /supabase/security_fix_13_enable_extraction_queue_rls.sql
-- Purpose: Secure aloa_knowledge_extraction_queue for background processing.

ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aloa_knowledge_extraction_queue'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_knowledge_extraction_queue', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins view extraction queue" ON aloa_knowledge_extraction_queue
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role manage extraction queue" ON aloa_knowledge_extraction_queue
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  );

DO $$
BEGIN
  RAISE NOTICE 'Knowledge extraction queue RLS configured.';
END $$;
