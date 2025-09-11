-- =====================================================
-- ALOA PROJECT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This file contains ALL database tables for the Aloa project management system.
-- These tables are completely separate from the legacy custom forms application.
-- All tables use the 'aloa_' prefix to ensure no conflicts.

-- =====================================================
-- CORE PROJECT TABLES
-- =====================================================

-- Main projects table
CREATE TABLE IF NOT EXISTS aloa_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  project_type TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  budget DECIMAL(10,2),
  ai_context TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projectlets (project phases/sections)
CREATE TABLE IF NOT EXISTS aloa_projectlets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  status TEXT DEFAULT 'available',
  sequence_order INTEGER DEFAULT 0,
  deadline DATE,
  completion_date DATE,
  unlock_condition JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- APPLETS SYSTEM
-- =====================================================

-- Library of reusable applet templates
CREATE TABLE IF NOT EXISTS aloa_applet_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  icon TEXT,
  default_config JSONB DEFAULT '{}',
  tags TEXT[],
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  client_instructions TEXT,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applets attached to projectlets
CREATE TABLE IF NOT EXISTS aloa_applets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  library_applet_id UUID REFERENCES aloa_applet_library(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  form_id UUID, -- References aloa_forms.id when type='form'
  upload_url TEXT,
  upload_file_urls TEXT[],
  status TEXT DEFAULT 'pending',
  completion_percentage INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  revision_count INTEGER DEFAULT 0,
  revision_notes TEXT,
  client_can_skip BOOLEAN DEFAULT false,
  client_instructions TEXT,
  internal_notes TEXT,
  completion_criteria JSONB DEFAULT '{}',
  dependencies UUID[],
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applet interactions tracking
CREATE TABLE IF NOT EXISTS aloa_applet_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applet_id UUID REFERENCES aloa_applets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('view', 'submission', 'approval', 'revision_request', 'skip', 'completion')),
  user_id UUID,
  user_role TEXT,
  data JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FORMS SYSTEM (Separate from legacy forms)
-- =====================================================

-- Form definitions
CREATE TABLE IF NOT EXISTS aloa_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url_id TEXT UNIQUE NOT NULL,
  markdown_content TEXT,
  aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form fields
CREATE TABLE IF NOT EXISTS aloa_form_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  placeholder TEXT,
  options JSONB,
  validation JSONB,
  field_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form responses
CREATE TABLE IF NOT EXISTS aloa_form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
  aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROJECT MANAGEMENT TABLES
-- =====================================================

-- Project timeline/activity log
CREATE TABLE IF NOT EXISTS aloa_project_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project team members
CREATE TABLE IF NOT EXISTS aloa_project_team (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID
);

-- Project documents and attachments
CREATE TABLE IF NOT EXISTS aloa_project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE SET NULL,
  document_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Knowledge base
CREATE TABLE IF NOT EXISTS aloa_project_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Insights
CREATE TABLE IF NOT EXISTS aloa_project_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  source_references JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project forms (linking forms to projects/projectlets)
CREATE TABLE IF NOT EXISTS aloa_project_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  form_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  form_type TEXT,
  is_active BOOLEAN DEFAULT true,
  responses_required INTEGER DEFAULT 1,
  responses_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projectlet steps (optional detailed steps within projectlets)
CREATE TABLE IF NOT EXISTS aloa_projectlet_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  sequence_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  is_required BOOLEAN DEFAULT true,
  form_id UUID,
  link_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_aloa_projects_status ON aloa_projects(status);
CREATE INDEX IF NOT EXISTS idx_aloa_projects_created ON aloa_projects(created_at DESC);

-- Projectlet indexes
CREATE INDEX IF NOT EXISTS idx_aloa_projectlets_project ON aloa_projectlets(project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_projectlets_status ON aloa_projectlets(status);
CREATE INDEX IF NOT EXISTS idx_aloa_projectlets_sequence ON aloa_projectlets(project_id, sequence_order);

-- Applet indexes
CREATE INDEX IF NOT EXISTS idx_aloa_applets_projectlet ON aloa_applets(projectlet_id);
CREATE INDEX IF NOT EXISTS idx_aloa_applets_status ON aloa_applets(status);
CREATE INDEX IF NOT EXISTS idx_aloa_applets_order ON aloa_applets(projectlet_id, order_index);
CREATE INDEX IF NOT EXISTS idx_aloa_applets_form ON aloa_applets(form_id) WHERE form_id IS NOT NULL;

-- Form indexes
CREATE INDEX IF NOT EXISTS idx_aloa_forms_project ON aloa_forms(aloa_project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_forms_url ON aloa_forms(url_id);
CREATE INDEX IF NOT EXISTS idx_aloa_forms_status ON aloa_forms(status);

-- Form field indexes
CREATE INDEX IF NOT EXISTS idx_aloa_form_fields_form ON aloa_form_fields(aloa_form_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_fields_order ON aloa_form_fields(aloa_form_id, field_order);

-- Form response indexes
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_form ON aloa_form_responses(aloa_form_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_project ON aloa_form_responses(aloa_project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_submitted ON aloa_form_responses(submitted_at DESC);

-- Timeline indexes
CREATE INDEX IF NOT EXISTS idx_aloa_timeline_project ON aloa_project_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_timeline_projectlet ON aloa_project_timeline(projectlet_id);
CREATE INDEX IF NOT EXISTS idx_aloa_timeline_created ON aloa_project_timeline(created_at DESC);

-- Interaction indexes
CREATE INDEX IF NOT EXISTS idx_aloa_interactions_applet ON aloa_applet_interactions(applet_id);
CREATE INDEX IF NOT EXISTS idx_aloa_interactions_project ON aloa_applet_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_interactions_created ON aloa_applet_interactions(created_at DESC);

-- =====================================================
-- PERMISSIONS (Adjust as needed)
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY (Optional - uncomment to enable)
-- =====================================================

-- ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE aloa_projectlets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE aloa_applets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE aloa_forms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE aloa_form_fields ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE aloa_form_responses ENABLE ROW LEVEL SECURITY;

-- Add RLS policies as needed for your security requirements