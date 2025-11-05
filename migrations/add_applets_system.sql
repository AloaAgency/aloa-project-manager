-- Applets System: Modular components that can be assembled into Projectlets
-- This replaces the simpler "steps" system with a more flexible applet-based architecture

-- First, create the applet types enum
CREATE TYPE applet_type AS ENUM (
  'form',           -- Client fills out a form
  'review',         -- Client reviews/approves work or requests revision
  'upload',         -- Agency uploads files/links for client review
  'signoff',        -- Final approval/sign-off
  'moodboard',      -- Special mood board selection applet
  'sitemap_builder', -- Interactive sitemap creation
  'content_gather', -- Content collection applet
  'feedback_loop'   -- Iterative feedback collection
);

-- Core Applet Library Table (reusable applet templates)
CREATE TABLE IF NOT EXISTS aloa_applet_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  type applet_type NOT NULL,
  icon TEXT, -- Icon identifier for UI
  
  -- Configuration Schema
  config_schema JSONB DEFAULT '{}', -- Defines what configuration options this applet type supports
  default_config JSONB DEFAULT '{}', -- Default configuration values
  
  -- Behavior
  is_client_facing BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  allows_revision BOOLEAN DEFAULT false,
  auto_completes BOOLEAN DEFAULT false, -- Does it complete automatically based on conditions?
  
  -- Library Management
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false, -- For future premium features
  usage_count INTEGER DEFAULT 0, -- Track popularity
  
  -- Metadata
  tags TEXT[], -- For categorization and search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Applet Instances (actual applets used in projectlets)
CREATE TABLE IF NOT EXISTS aloa_applets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projectlet_id UUID NOT NULL REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  library_applet_id UUID REFERENCES aloa_applet_library(id), -- Optional reference to library item
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  type applet_type NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Configuration (overrides library defaults)
  config JSONB DEFAULT '{}', -- Actual configuration for this instance
  
  -- Type-specific data
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL, -- For form applets
  upload_url TEXT, -- For upload applets (Figma links, etc.)
  upload_file_urls TEXT[], -- Array of uploaded file URLs
  
  -- Status and Progress
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'in_progress', 'awaiting_review', 'revision_requested', 'approved', 'completed', 'skipped')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- Approval/Review Data
  requires_approval BOOLEAN DEFAULT false,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  revision_count INTEGER DEFAULT 0,
  revision_notes TEXT,
  
  -- Client Interaction
  client_can_skip BOOLEAN DEFAULT false,
  client_instructions TEXT, -- Special instructions shown to client
  internal_notes TEXT, -- Notes only visible to agency
  
  -- Completion Rules
  completion_criteria JSONB DEFAULT '{}', -- Defines what needs to happen for this to complete
  dependencies UUID[], -- Other applet IDs that must complete first
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applet Responses/Interactions Table
CREATE TABLE IF NOT EXISTS aloa_applet_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applet_id UUID NOT NULL REFERENCES aloa_applets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  -- Interaction Type
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('submission', 'approval', 'revision_request', 'comment', 'upload', 'view')),
  
  -- User Info
  user_email TEXT,
  user_role TEXT CHECK (user_role IN ('client', 'agency', 'admin')),
  
  -- Interaction Data
  data JSONB DEFAULT '{}', -- Flexible storage for different interaction types
  files TEXT[], -- Any files associated with this interaction
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projectlet Templates (pre-made projectlet configurations)
CREATE TABLE IF NOT EXISTS aloa_projectlet_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'discovery', 'design', 'development', 'content'
  
  -- Template Configuration
  applet_sequence JSONB NOT NULL, -- Array of applet configurations in order
  estimated_duration_days INTEGER,
  
  -- Usage
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Project Templates (complete project structures)
CREATE TABLE IF NOT EXISTS aloa_project_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- e.g., 'web-redesign', 'new-website', 'branding', 'maintenance'
  
  -- Template Structure
  projectlet_sequence JSONB NOT NULL, -- Array of projectlet template IDs in order
  default_timeline_weeks INTEGER,
  
  -- Pricing/Scope Guidelines
  suggested_price_range JSONB,
  typical_deliverables TEXT[],
  
  -- Usage
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for performance
CREATE INDEX idx_applets_projectlet ON aloa_applets(projectlet_id);
CREATE INDEX idx_aloa_applets_project ON aloa_applets(project_id);
CREATE INDEX idx_applets_status ON aloa_applets(status);
CREATE INDEX idx_applets_type ON aloa_applets(type);
CREATE INDEX idx_applet_interactions_applet ON aloa_applet_interactions(applet_id);
CREATE INDEX idx_applet_interactions_project ON aloa_applet_interactions(project_id);
CREATE INDEX idx_applet_library_type ON aloa_applet_library(type);
CREATE INDEX idx_applet_library_active ON aloa_applet_library(is_active);

-- Insert default applet library items
INSERT INTO aloa_applet_library (name, description, type, icon, config_schema, is_active) VALUES
  ('Client Form', 'Collect information from the client', 'form', 'FileText', 
   '{"form_id": "uuid", "required": "boolean"}', true),
  
  ('Design Review', 'Client reviews and approves design work', 'review', 'Eye',
   '{"allow_comments": "boolean", "require_approval": "boolean"}', true),
  
  ('Agency Upload', 'Upload files or links for client review', 'upload', 'Upload',
   '{"accepted_types": "array", "max_files": "number"}', true),
  
  ('Final Sign-Off', 'Client provides final approval', 'signoff', 'CheckCircle',
   '{"terms_text": "string", "require_signature": "boolean"}', true),
  
  ('Mood Board Selection', 'Interactive mood board selection tool', 'moodboard', 'Palette',
   '{"options_count": "number", "allow_multiple": "boolean"}', true);

-- Function to check if all applets in a projectlet are complete
CREATE OR REPLACE FUNCTION check_projectlet_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all applets in the projectlet are completed
  IF NOT EXISTS (
    SELECT 1 FROM aloa_applets 
    WHERE projectlet_id = NEW.projectlet_id 
    AND status NOT IN ('completed', 'skipped', 'approved')
  ) THEN
    -- All applets are done, update projectlet status
    UPDATE aloa_projectlets 
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = NEW.projectlet_id
    AND status != 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete projectlets when all applets are done
CREATE TRIGGER trigger_check_projectlet_completion
AFTER UPDATE OF status ON aloa_applets
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'skipped', 'approved'))
EXECUTE FUNCTION check_projectlet_completion();

-- Function to clone a projectlet template
CREATE OR REPLACE FUNCTION clone_projectlet_from_template(
  p_template_id UUID,
  p_projectlet_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_applet_config JSONB;
  v_applet JSONB;
  v_project_id UUID;
BEGIN
  -- Get the template configuration
  SELECT applet_sequence INTO v_applet_config
  FROM aloa_projectlet_templates
  WHERE id = p_template_id;
  
  SELECT project_id INTO v_project_id
  FROM aloa_projectlets
  WHERE id = p_projectlet_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Unable to determine project for projectlet %', p_projectlet_id;
  END IF;
  
  -- Create applets from the template
  FOR v_applet IN SELECT * FROM jsonb_array_elements(v_applet_config)
  LOOP
    INSERT INTO aloa_applets (
      projectlet_id,
      project_id,
      name,
      description,
      type,
      order_index,
      config,
      requires_approval,
      client_instructions
    ) VALUES (
      p_projectlet_id,
      v_project_id,
      v_applet->>'name',
      v_applet->>'description',
      (v_applet->>'type')::applet_type,
      (v_applet->>'order_index')::INTEGER,
      v_applet->'config',
      (v_applet->>'requires_approval')::BOOLEAN,
      v_applet->>'client_instructions'
    );
  END LOOP;
  
  -- Update template usage count
  UPDATE aloa_projectlet_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE aloa_applet_library IS 'Library of reusable applet templates';
COMMENT ON TABLE aloa_applets IS 'Actual applet instances within projectlets';
COMMENT ON TABLE aloa_applet_interactions IS 'Tracks all interactions with applets';
COMMENT ON TABLE aloa_projectlet_templates IS 'Pre-configured projectlet templates';
COMMENT ON TABLE aloa_project_templates IS 'Complete project structure templates';
COMMENT ON FUNCTION check_projectlet_completion IS 'Auto-completes projectlets when all applets are done';
COMMENT ON FUNCTION clone_projectlet_from_template IS 'Creates applets in a projectlet from a template';
