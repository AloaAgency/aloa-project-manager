-- Completely fix the aloa_user_profiles table and policies

-- First, drop ALL existing policies to eliminate recursion
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'aloa_user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON aloa_user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Disable RLS completely for now
ALTER TABLE aloa_user_profiles DISABLE ROW LEVEL SECURITY;

-- Ensure the table has all needed columns
ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on email if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'aloa_user_profiles_email_key'
    ) THEN
        ALTER TABLE aloa_user_profiles ADD CONSTRAINT aloa_user_profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Ensure ross@aloa.agency exists and is super_admin
INSERT INTO aloa_user_profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
    'b49bd6a1-4a39-452a-801b-0d7ce3a553b1',
    'ross@aloa.agency',
    'Ross Palmer',
    'super_admin',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
    email = 'ross@aloa.agency',
    role = 'super_admin',
    updated_at = NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aloa_user_profiles_email ON aloa_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_aloa_user_profiles_role ON aloa_user_profiles(role);

-- Leave RLS disabled for now to avoid any issues
-- We'll handle security at the API level with service role key

COMMENT ON TABLE aloa_user_profiles IS 'User profiles for Aloa project management - RLS disabled, security handled at API level';