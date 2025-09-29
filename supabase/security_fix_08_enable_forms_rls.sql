-- File: /supabase/security_fix_08_enable_forms_rls.sql
-- Purpose: Enable RLS and consistent policies for the forms stack:
--          aloa_forms, aloa_form_fields, aloa_form_responses, aloa_form_response_answers.

ALTER TABLE aloa_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_response_answers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_forms',
        'aloa_form_fields',
        'aloa_form_responses',
        'aloa_form_response_answers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Forms visible to project members/stakeholders and admins manage forms
CREATE POLICY "View forms in user projects" ON aloa_forms
  FOR SELECT TO authenticated
  USING (
    (aloa_project_id IS NOT NULL AND (
      is_project_member(aloa_project_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM aloa_project_stakeholders s
        WHERE s.project_id = aloa_forms.aloa_project_id
          AND s.user_id = auth.uid()
      )
    ))
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage forms" ON aloa_forms
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_forms
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Form fields follow their parent form's visibility
CREATE POLICY "View fields for accessible forms" ON aloa_form_fields
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_fields.aloa_form_id
        AND (
          (f.aloa_project_id IS NOT NULL AND (
            is_project_member(f.aloa_project_id, auth.uid())
            OR EXISTS (
              SELECT 1 FROM aloa_project_stakeholders s
              WHERE s.project_id = f.aloa_project_id
                AND s.user_id = auth.uid()
            )
          ))
          OR is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Admins manage fields" ON aloa_form_fields
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_form_fields
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Form responses: contributors submit to accessible forms; admins view all
CREATE POLICY "View responses in user projects" ON aloa_form_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_responses.aloa_form_id
        AND (
          (f.aloa_project_id IS NOT NULL AND (
            is_project_member(f.aloa_project_id, auth.uid())
            OR EXISTS (
              SELECT 1 FROM aloa_project_stakeholders s
              WHERE s.project_id = f.aloa_project_id
                AND s.user_id = auth.uid()
            )
          ))
          OR is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Users submit responses" ON aloa_form_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_responses.aloa_form_id
        AND f.aloa_project_id IS NOT NULL
        AND is_project_member(f.aloa_project_id, auth.uid())
    )
  );

CREATE POLICY "Service role bypass" ON aloa_form_responses
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Form response answers mirror response access
CREATE POLICY "View answers for accessible responses" ON aloa_form_response_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_form_responses r
      JOIN aloa_forms f ON f.id = r.aloa_form_id
      WHERE r.id = aloa_form_response_answers.response_id
        AND (
          (f.aloa_project_id IS NOT NULL AND (
            is_project_member(f.aloa_project_id, auth.uid())
            OR EXISTS (
              SELECT 1 FROM aloa_project_stakeholders s
              WHERE s.project_id = f.aloa_project_id
                AND s.user_id = auth.uid()
            )
          ))
          OR is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Service role bypass" ON aloa_form_response_answers
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

DO $$
BEGIN
  RAISE NOTICE 'Forms RLS configured.';
END $$;
