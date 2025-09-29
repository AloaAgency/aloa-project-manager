-- File: /supabase/security_fix_17_lockdown_functions.sql
-- Purpose: Lock down SECURITY DEFINER functions by setting their search_path explicitly.
-- This prevents malicious users from hijacking execution via altered search_path values.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname = 'public' -- adjust if functions live in other schemas
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = %I;'
      , rec.schema_name
      , rec.function_name
      , rec.identity_args
      , rec.schema_name
    );
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Security-definer functions in schema public now have fixed search_path.';
END $$;
