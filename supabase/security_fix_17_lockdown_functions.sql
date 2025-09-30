-- File: /supabase/security_fix_17_lockdown_functions.sql
-- Purpose: Lock down ALL functions by setting their search_path explicitly.
-- This prevents malicious users from hijacking execution via altered search_path values.
-- Fixes Supabase linter warning: "Function Search Path Mutable"

DO $$
DECLARE
  rec RECORD;
  func_count INTEGER := 0;
BEGIN
  -- Fix ALL functions in public schema (not just SECURITY DEFINER)
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      p.proconfig AS current_config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      -- Exclude helper functions we already set (is_admin, is_project_member, etc)
      AND p.proname NOT IN ('is_admin', 'is_project_member', 'get_user_projects', 'get_user_role')
      -- Only fix functions that don't already have search_path set
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS config
        WHERE config LIKE 'search_path=%'
      ))
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = %I;',
        rec.schema_name,
        rec.function_name,
        rec.identity_args,
        rec.schema_name
      );
      func_count := func_count + 1;
      RAISE NOTICE 'Fixed: %.%', rec.schema_name, rec.function_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to alter function %.%: %', rec.schema_name, rec.function_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Successfully fixed search_path for % functions in schema public', func_count;
END $$;
