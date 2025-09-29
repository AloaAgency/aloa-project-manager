-- File: /supabase/security_fix_03_enable_user_profiles_rls.sql
-- Purpose: Enable Row Level Security on aloa_user_profiles with sane policies
-- This script is idempotent and can be re-run safely.

-- Helper to read the caller's current role without triggering recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT role
  INTO result
  FROM aloa_user_profiles
  WHERE id = user_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_role(UUID) IS 'Returns the stored role for a user without being blocked by RLS.';

-- Make sure RLS is active before recreating policies
ALTER TABLE aloa_user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies so we can recreate them cleanly
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aloa_user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_user_profiles', pol.policyname);
  END LOOP;
END $$;

-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON aloa_user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can see every profile
CREATE POLICY "Admins can view all profiles" ON aloa_user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Users can update their own profile but cannot change role unless they are already admin
CREATE POLICY "Users can update own profile" ON aloa_user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      is_admin(auth.uid())
      OR role = get_user_role(auth.uid())
    )
  );

-- Service role bypass for system tasks
CREATE POLICY "Service role bypass" ON aloa_user_profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Confirm setup for log visibility when executed manually
DO $$
BEGIN
  RAISE NOTICE 'aloa_user_profiles RLS policies recreated successfully.';
END $$;
