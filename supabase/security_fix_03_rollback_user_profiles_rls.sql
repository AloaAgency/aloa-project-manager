-- File: /supabase/security_fix_03_rollback_user_profiles_rls.sql
-- Purpose: Roll back the RLS changes introduced in security_fix_03_enable_user_profiles_rls.sql

-- Remove policies created by the fix script if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Service role bypass" ON aloa_user_profiles;

-- Drop helper function added as part of the fix
DROP FUNCTION IF EXISTS get_user_role(UUID);

-- Disable RLS so behavior returns to the pre-fix state
ALTER TABLE aloa_user_profiles DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE 'aloa_user_profiles RLS policies removed and RLS disabled.';
END $$;
