-- Create user profiles table that extends Supabase Auth
-- This links to auth.users table that Supabase Auth creates automatically
CREATE TABLE IF NOT EXISTS aloa_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  -- Role can be: 'super_admin', 'project_admin', 'team_member', 'client'
  
  -- Organization/company info
  company_name TEXT,
  phone TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Settings
  preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{"email": true, "in_app": true}'
);

-- Create project members table to link users to projects with specific roles
CREATE TABLE IF NOT EXISTS aloa_project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,
  
  -- Project-specific role (can override global role for this project)
  project_role TEXT NOT NULL DEFAULT 'viewer',
  -- Can be: 'owner', 'admin', 'editor', 'viewer'
  
  -- Permissions
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_invite BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  
  -- Metadata
  invited_by UUID REFERENCES aloa_user_profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  last_accessed TIMESTAMPTZ,
  
  -- Unique constraint to prevent duplicate memberships
  UNIQUE(project_id, user_id)
);

-- Create user invitations table for pending invites
CREATE TABLE IF NOT EXISTS aloa_user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  -- Invitation details
  role TEXT NOT NULL DEFAULT 'client',
  project_role TEXT DEFAULT 'viewer',
  invitation_token TEXT UNIQUE NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
  invited_by UUID NOT NULL REFERENCES aloa_user_profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Optional message to include with invitation
  message TEXT,
  
  -- Track invitation attempts
  send_attempts INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ
);

-- Create activity log table for audit trail
CREATE TABLE IF NOT EXISTS aloa_user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES aloa_user_profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete', 'view', 'download', 'upload', 'submit_form'
  resource_type TEXT, -- 'project', 'form', 'response', 'file', 'applet', etc.
  resource_id TEXT, -- ID of the resource acted upon
  
  -- Additional context
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_aloa_user_profiles_email ON aloa_user_profiles(email);
CREATE INDEX idx_aloa_user_profiles_role ON aloa_user_profiles(role);
CREATE INDEX idx_aloa_project_members_project ON aloa_project_members(project_id);
CREATE INDEX idx_aloa_project_members_user ON aloa_project_members(user_id);
CREATE INDEX idx_aloa_user_invitations_email ON aloa_user_invitations(email);
CREATE INDEX idx_aloa_user_invitations_token ON aloa_user_invitations(invitation_token);
CREATE INDEX idx_aloa_user_activity_log_user ON aloa_user_activity_log(user_id);
CREATE INDEX idx_aloa_user_activity_log_project ON aloa_user_activity_log(project_id);
CREATE INDEX idx_aloa_user_activity_log_created ON aloa_user_activity_log(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION aloa_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for aloa_user_profiles
CREATE TRIGGER aloa_update_user_profiles_updated_at
BEFORE UPDATE ON aloa_user_profiles
FOR EACH ROW
EXECUTE FUNCTION aloa_update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION aloa_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.aloa_user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile on auth.users insert
CREATE TRIGGER aloa_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION aloa_handle_new_user();

-- Enable Row Level Security
ALTER TABLE aloa_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aloa_user_profiles
-- Users can view their own profile
CREATE POLICY "Aloa users can view own profile" ON aloa_user_profiles
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Aloa users can update own profile" ON aloa_user_profiles
FOR UPDATE USING (auth.uid() = id);

-- Super admins can view all profiles
CREATE POLICY "Aloa super admins can view all profiles" ON aloa_user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- RLS Policies for aloa_project_members
-- Users can view memberships for projects they belong to
CREATE POLICY "Aloa users can view project memberships" ON aloa_project_members
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM aloa_project_members pm
    WHERE pm.project_id = aloa_project_members.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Project admins can manage memberships
CREATE POLICY "Aloa project admins can manage memberships" ON aloa_project_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM aloa_project_members pm
    WHERE pm.project_id = aloa_project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.project_role IN ('owner', 'admin')
  )
);

-- RLS Policies for aloa_user_invitations
-- Only admins can view and manage invitations
CREATE POLICY "Aloa admins can manage invitations" ON aloa_user_invitations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'project_admin')
  )
);

-- Users can view their own invitations
CREATE POLICY "Aloa users can view own invitations" ON aloa_user_invitations
FOR SELECT USING (email = (
  SELECT email FROM aloa_user_profiles WHERE id = auth.uid()
));

-- RLS Policies for activity log
-- Users can view their own activity
CREATE POLICY "Aloa users can view own activity" ON aloa_user_activity_log
FOR SELECT USING (user_id = auth.uid());

-- Admins can view all activity for their projects
CREATE POLICY "Aloa admins can view project activity" ON aloa_user_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM aloa_project_members
    WHERE project_id = aloa_user_activity_log.project_id
    AND user_id = auth.uid()
    AND project_role IN ('owner', 'admin')
  )
);

-- Add foreign key to link existing responses to authenticated users
ALTER TABLE aloa_form_responses 
ADD COLUMN IF NOT EXISTS authenticated_user_id UUID REFERENCES aloa_user_profiles(id);

-- Add foreign key to link existing project files to authenticated users
-- Note: Check if project_files exists, it might be aloa_project_files
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_files') THEN
    ALTER TABLE project_files
    ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES aloa_user_profiles(id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_files') THEN
    ALTER TABLE aloa_project_files
    ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES aloa_user_profiles(id);
  END IF;
END $$;

-- Function to log user activity
CREATE OR REPLACE FUNCTION aloa_log_user_activity(
  p_user_id UUID,
  p_project_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO aloa_user_activity_log (
    user_id, project_id, action, resource_type, 
    resource_id, details, ip_address, user_agent
  )
  VALUES (
    p_user_id, p_project_id, p_action, p_resource_type,
    p_resource_id, p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;