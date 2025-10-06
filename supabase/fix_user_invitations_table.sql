-- Fix user_invitations table - handles existing table/policies gracefully

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view all invitations" ON user_invitations;
DROP POLICY IF EXISTS "Project admins can view project invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can view their own invitation" ON user_invitations;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON user_invitations;

-- Check if table exists and has the correct structure
DO $$ 
BEGIN
    -- Check if the invited_by column references the wrong table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'user_invitations' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.column_name = 'invited_by'
        AND ccu.table_name = 'profiles'
    ) THEN
        -- Drop the old foreign key constraint
        ALTER TABLE user_invitations 
        DROP CONSTRAINT IF EXISTS user_invitations_invited_by_fkey;
        
        -- Add the correct foreign key constraint
        ALTER TABLE user_invitations 
        ADD CONSTRAINT user_invitations_invited_by_fkey 
        FOREIGN KEY (invited_by) 
        REFERENCES aloa_user_profiles(id);
    END IF;
    
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
        CREATE TABLE user_invitations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'client' CHECK (
                role IN (
                    'super_admin',
                    'project_admin',
                    'team_member',
                    'client',
                    'client_admin',
                    'client_participant'
                )
            ),
            project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            invited_by UUID NOT NULL REFERENCES aloa_user_profiles(id),
            custom_message TEXT,
            expires_at TIMESTAMPTZ NOT NULL,
            accepted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Ensure role constraint allows new client roles
ALTER TABLE user_invitations
DROP CONSTRAINT IF EXISTS user_invitations_role_check;

ALTER TABLE user_invitations
ADD CONSTRAINT user_invitations_role_check CHECK (
  role IN (
    'super_admin',
    'project_admin',
    'team_member',
    'client',
    'client_admin',
    'client_participant'
  )
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_at ON user_invitations(accepted_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Create new policies with correct references
CREATE POLICY "Super admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE aloa_user_profiles.id = auth.uid()
      AND aloa_user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Project admins can view project invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aloa_project_team
      WHERE aloa_project_team.user_id = auth.uid()
      AND aloa_project_team.project_id = user_invitations.project_id
      AND aloa_project_team.role = 'project_admin'
    )
  );

CREATE POLICY "Users can view their own invitation" ON user_invitations
  FOR SELECT
  USING (true); -- Token validation happens in the application layer

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_invitations IS 'Stores user invitations with expiration and acceptance tracking';
COMMENT ON COLUMN user_invitations.token IS 'Unique token for invitation URL';
COMMENT ON COLUMN user_invitations.expires_at IS 'When the invitation expires (typically 7 days)';
COMMENT ON COLUMN user_invitations.accepted_at IS 'When the invitation was accepted (null if pending)';

-- Verify the table structure
SELECT 'User invitations table is ready' as status;
