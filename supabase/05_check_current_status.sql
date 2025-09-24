-- File: /supabase/05_check_current_status.sql
-- Check current RLS status and what needs to be done

-- 1. Check if RLS is enabled on aloa_projects
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✓ RLS is ENABLED'
    ELSE '✗ RLS is DISABLED (SECURITY RISK!)'
  END as rls_status
FROM pg_tables
WHERE tablename = 'aloa_projects';

-- 2. Check if helper functions exist
SELECT
  proname as function_name,
  CASE
    WHEN proname IS NOT NULL THEN '✓ Function exists'
    ELSE '✗ Function missing'
  END as status
FROM pg_proc
WHERE proname IN ('is_project_member', 'is_admin', 'get_user_projects')
ORDER BY proname;

-- 3. Check existing policies on aloa_projects
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN policyname IS NOT NULL THEN '✓ Policy exists'
    ELSE '✗ No policy'
  END as status
FROM pg_policies
WHERE tablename = 'aloa_projects'
ORDER BY policyname;

-- 4. Summary and next steps
DO $$
DECLARE
  rls_enabled BOOLEAN;
  helper_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'aloa_projects';

  -- Count helper functions
  SELECT COUNT(*) INTO helper_count
  FROM pg_proc
  WHERE proname IN ('is_project_member', 'is_admin', 'get_user_projects');

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'aloa_projects';

  RAISE NOTICE '';
  RAISE NOTICE '=== CURRENT STATUS SUMMARY ===';
  RAISE NOTICE 'RLS Enabled: %', CASE WHEN rls_enabled THEN 'YES ✓' ELSE 'NO ✗ (CRITICAL!)' END;
  RAISE NOTICE 'Helper Functions: % of 3', helper_count;
  RAISE NOTICE 'Policies: %', policy_count;
  RAISE NOTICE '';

  IF NOT rls_enabled THEN
    RAISE NOTICE '=== ACTION REQUIRED ===';
    RAISE NOTICE '1. RLS is currently DISABLED on aloa_projects - this is a critical security issue';
    RAISE NOTICE '2. Run: 05_fix_projects.sql to enable RLS and set up policies';
  ELSIF helper_count < 3 THEN
    RAISE NOTICE '=== ACTION REQUIRED ===';
    RAISE NOTICE '1. Helper functions are missing';
    RAISE NOTICE '2. Run: 02_security_helpers.sql first';
    RAISE NOTICE '3. Then run: 05_fix_projects.sql';
  ELSE
    RAISE NOTICE '=== STATUS: GOOD ===';
    RAISE NOTICE 'RLS is enabled and configured on aloa_projects';
  END IF;
END $$;