-- File: /supabase/05_test_projects_rls.sql
-- Test script to verify RLS on aloa_projects table
-- Run this AFTER applying 05_fix_projects.sql

-- First, check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'aloa_projects';

-- Check existing policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'aloa_projects'
ORDER BY policyname;

-- Simple functionality test
-- This should work for authenticated users with proper access
DO $$
DECLARE
  project_count INTEGER;
BEGIN
  -- Try to count projects (will respect RLS based on current user)
  SELECT COUNT(*) INTO project_count FROM aloa_projects;
  RAISE NOTICE 'Accessible projects: %', project_count;

  -- Check if helper functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_project_member') THEN
    RAISE NOTICE '✓ is_project_member function exists';
  ELSE
    RAISE WARNING '✗ is_project_member function missing - may need to run 02_security_helpers.sql first';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    RAISE NOTICE '✓ is_admin function exists';
  ELSE
    RAISE WARNING '✗ is_admin function missing - may need to run 02_security_helpers.sql first';
  END IF;
END $$;

-- Summary
SELECT
  CASE
    WHEN rowsecurity THEN '✓ RLS is ENABLED on aloa_projects'
    ELSE '✗ RLS is DISABLED on aloa_projects - Security Risk!'
  END as security_status
FROM pg_tables
WHERE tablename = 'aloa_projects';