-- File: supabase/09_security_tests.sql
-- Purpose: RLS regression report with diagnostics (Supabase SQL editor).
-- Prerequisite: run supabase/security_fix_01_create_test_users.sql first.

CREATE OR REPLACE FUNCTION pg_temp.security_rls_report()
RETURNS TABLE(check_name TEXT, result TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_test_project   CONSTANT uuid := '511306f6-0316-4a60-a318-1509d643238a';
  v_other_project  CONSTANT uuid := '2fbb4e92-0ef5-4ae4-bf73-000000000000';
  v_client_id      uuid;
  v_outsider_id    uuid;
  v_admin_id       uuid;
  v_count          integer;
  v_role_text      text;
BEGIN
  SELECT id INTO v_client_id FROM aloa_user_profiles WHERE email = 'test_client@test.com';
  SELECT id INTO v_outsider_id FROM aloa_user_profiles WHERE email = 'test_outsider@test.com';
  SELECT id INTO v_admin_id FROM aloa_user_profiles WHERE email = 'test_admin@test.com';

  IF v_client_id IS NULL OR v_outsider_id IS NULL OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Missing seeded test profiles. Run security_fix_01_create_test_users.sql first.';
  END IF;

  -- Client context -------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_client_id, 'role', 'authenticated')::text, true);
  RETURN QUERY SELECT 'client_auth_uid', COALESCE(auth.uid()::text, 'NULL');
  RETURN QUERY SELECT 'client_auth_role', COALESCE(auth.jwt()->>'role', 'NULL');

  SELECT COUNT(*) INTO v_count FROM aloa_projects;
  RETURN QUERY SELECT 'client_visible_projects', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_project_knowledge;
  RETURN QUERY SELECT 'client_visible_knowledge', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_forms WHERE aloa_project_id = v_test_project;
  RETURN QUERY SELECT 'client_forms_for_test_project', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_forms WHERE aloa_project_id = v_other_project;
  RETURN QUERY SELECT 'client_forms_for_other_project', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_project_knowledge WHERE project_id = v_other_project;
  RETURN QUERY SELECT 'client_knowledge_for_other_project', v_count::text;

  -- Outsider context -----------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_outsider_id, 'role', 'authenticated')::text, true);
  RETURN QUERY SELECT 'outsider_auth_uid', COALESCE(auth.uid()::text, 'NULL');
  RETURN QUERY SELECT 'outsider_auth_role', COALESCE(auth.jwt()->>'role', 'NULL');

  SELECT COUNT(*) INTO v_count FROM aloa_projects;
  RETURN QUERY SELECT 'outsider_projects', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_forms;
  RETURN QUERY SELECT 'outsider_forms', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_applets;
  RETURN QUERY SELECT 'outsider_applets', v_count::text;

  BEGIN
    INSERT INTO aloa_project_knowledge (
      project_id, source_type, source_id, source_name, content_type, content,
      content_summary, category, tags, importance_score, extracted_by,
      extraction_confidence, processed_at, is_current
    ) VALUES (
      v_test_project,
      'rls_test',
      'rls_test',
      'RLS Smoke Test',
      'text',
      'blocked by RLS',
      'attempted outsider write',
      'rls_test',
      ARRAY['rls','test'],
      1,
      'security_suite',
      0.5,
      NOW(),
      true
    );
    RETURN QUERY SELECT 'outsider_knowledge_insert', 'unexpected success';
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN QUERY SELECT 'outsider_knowledge_insert', 'blocked as expected';
  END;

  BEGIN
    UPDATE aloa_projects SET name = name || ' (tamper)' WHERE id = v_test_project;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      RETURN QUERY SELECT 'outsider_project_update', 'blocked as expected (0 rows)';
    ELSE
      RETURN QUERY SELECT 'outsider_project_update', format('unexpected success (%s rows)', v_count);
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN QUERY SELECT 'outsider_project_update', 'blocked as expected';
  END;

  -- Admin context -------------------------------------------------------
  PERFORM set_config('role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_id, 'role', 'service_role')::text, true);
  RETURN QUERY SELECT 'admin_auth_uid', COALESCE(auth.uid()::text, 'NULL');
  RETURN QUERY SELECT 'admin_auth_role', COALESCE(auth.jwt()->>'role', 'NULL');

  SELECT COUNT(*) INTO v_count FROM aloa_projects;
  RETURN QUERY SELECT 'admin_projects', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_forms;
  RETURN QUERY SELECT 'admin_forms', v_count::text;

  SELECT COUNT(*) INTO v_count FROM aloa_applets;
  RETURN QUERY SELECT 'admin_applets', v_count::text;

  UPDATE aloa_projects SET updated_at = NOW() WHERE id = v_test_project;
  RETURN QUERY SELECT 'admin_project_update', 'succeeded';

END;
$$;

SELECT * FROM pg_temp.security_rls_report() ORDER BY check_name;
