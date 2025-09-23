-- Create table for storing projectlet templates
-- Drop the table if it exists to recreate with correct schema
DROP TABLE IF EXISTS aloa_projectlet_templates CASCADE;

CREATE TABLE aloa_projectlet_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- Stores the projectlet structure and applets
  category VARCHAR(100), -- Optional category like 'page', 'form', 'review'
  is_public BOOLEAN DEFAULT false, -- Whether template is available to all projects
  created_by UUID REFERENCES aloa_user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_projectlet_templates_name ON aloa_projectlet_templates(name);
CREATE INDEX idx_projectlet_templates_category ON aloa_projectlet_templates(category);
CREATE INDEX idx_projectlet_templates_is_public ON aloa_projectlet_templates(is_public);
CREATE INDEX idx_projectlet_templates_created_by ON aloa_projectlet_templates(created_by);

-- Add RLS policies
ALTER TABLE aloa_projectlet_templates ENABLE ROW LEVEL SECURITY;

-- Allow super_admin and project_admin to create, read, update, delete templates
CREATE POLICY "Admin users can manage templates" ON aloa_projectlet_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM aloa_user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'project_admin')
    )
  );

-- Allow all authenticated users to read public templates
CREATE POLICY "All users can read public templates" ON aloa_projectlet_templates
  FOR SELECT USING (is_public = true);

-- Allow users to read their own templates
CREATE POLICY "Users can read own templates" ON aloa_projectlet_templates
  FOR SELECT USING (created_by = auth.uid());

-- Add comment to table
COMMENT ON TABLE aloa_projectlet_templates IS 'Stores projectlet templates that can be reused across projects';
COMMENT ON COLUMN aloa_projectlet_templates.template_data IS 'JSON structure containing projectlet configuration and all associated applets';