-- Create aloa_user_profiles table if it doesn't exist
-- Or add missing columns if it does exist

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS aloa_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('super_admin', 'project_admin', 'team_member', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table exists
ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' 
CHECK (role IN ('super_admin', 'project_admin', 'team_member', 'client'));

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE aloa_user_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'aloa_user_profiles_email_key'
  ) THEN
    ALTER TABLE aloa_user_profiles ADD CONSTRAINT aloa_user_profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aloa_user_profiles_email ON aloa_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_aloa_user_profiles_role ON aloa_user_profiles(role);

-- Copy data from profiles table if it exists and has data
INSERT INTO aloa_user_profiles (id, email, full_name, avatar_url, role, created_at, updated_at)
SELECT 
  p.id,
  COALESCE(p.email, u.email) as email,
  p.full_name,
  p.avatar_url,
  p.role,
  p.created_at,
  p.updated_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM aloa_user_profiles WHERE aloa_user_profiles.id = p.id
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_aloa_user_profiles_updated_at ON aloa_user_profiles;
CREATE TRIGGER update_aloa_user_profiles_updated_at
  BEFORE UPDATE ON aloa_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE aloa_user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON aloa_user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON aloa_user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access" ON aloa_user_profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE aloa_user_profiles IS 'User profiles for the Aloa project management system';
COMMENT ON COLUMN aloa_user_profiles.role IS 'User role: super_admin, project_admin, team_member, or client';

-- Set ross@aloa.agency as super_admin in the new table
UPDATE aloa_user_profiles 
SET role = 'super_admin' 
WHERE email = 'ross@aloa.agency';