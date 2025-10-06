-- Project Management System for Aloa Web Design
-- This creates a new set of tables with aloa_ prefix to avoid conflicts with existing systems

-- Projects table (main container for each web design project)
CREATE TABLE aloa_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  contract_signed_date DATE,
  start_date DATE,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_progress', 'design_phase', 'development_phase', 'review', 'completed', 'on_hold')),
  rules JSONB DEFAULT '{"main_pages": 5, "aux_pages": 5}',
  introduction_video_url TEXT,
  payment_status JSONB DEFAULT '{"deposit": false, "design_complete": false, "final": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projectlets (mini-projects within a project)
CREATE TABLE aloa_projectlets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('form', 'design', 'content', 'review', 'milestone')),
  sequence_order INT NOT NULL,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'client_review', 'revision_requested', 'completed')),
  unlock_condition JSONB, -- Stores conditions for when this projectlet becomes available
  form_id UUID, -- Links to aloa_project_forms if this is a form-type projectlet
  deadline TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  metadata JSONB, -- Stores type-specific data (figma links, copy content, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Forms (forms specific to project management)
CREATE TABLE aloa_project_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL CHECK (form_type IN (
    'design_inspiration',
    'mood_board_selection',
    'font_selection',
    'color_palette',
    'homepage_content',
    'page_content',
    'sitemap_builder',
    'revision_request',
    'approval'
  )),
  fields JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  responses_required INT DEFAULT 1, -- How many responses needed before moving forward
  responses_received INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Responses (responses to project forms)
CREATE TABLE aloa_project_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES aloa_project_forms(id) ON DELETE CASCADE,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  respondent_email TEXT,
  respondent_name TEXT,
  data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Timeline Events (for tracking progress and notifications)
CREATE TABLE aloa_project_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'project_started',
    'projectlet_unlocked',
    'projectlet_completed',
    'form_submitted',
    'revision_requested',
    'design_approved',
    'payment_received',
    'deadline_missed',
    'reminder_sent',
    'milestone_reached'
  )),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Team Members (who can access what)
CREATE TABLE aloa_project_team (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (
    role IN (
      'client',
      'client_admin',
      'client_participant',
      'project_admin',
      'team_member',
      'admin',
      'designer',
      'developer',
      'copywriter',
      'viewer'
    )
  ),
  permissions JSONB DEFAULT '{"can_fill_forms": true, "can_approve": false, "can_edit_project": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email)
);

-- Project Files (for storing deliverables)
CREATE TABLE aloa_project_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id),
  file_type TEXT CHECK (file_type IN ('mood_board', 'design', 'copy', 'asset', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Queue (for email reminders)
CREATE TABLE aloa_notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id),
  recipient_email TEXT NOT NULL,
  notification_type TEXT CHECK (notification_type IN (
    'deadline_reminder',
    'projectlet_available',
    'approval_needed',
    'project_update',
    'payment_due'
  )),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gamification elements
CREATE TABLE aloa_project_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_aloa_projects_status ON aloa_projects(status);
CREATE INDEX idx_aloa_projects_client_email ON aloa_projects(client_email);
CREATE INDEX idx_aloa_projectlets_project_id ON aloa_projectlets(project_id);
CREATE INDEX idx_aloa_projectlets_status ON aloa_projectlets(status);
CREATE INDEX idx_aloa_projectlets_sequence ON aloa_projectlets(project_id, sequence_order);
CREATE INDEX idx_aloa_project_forms_project_id ON aloa_project_forms(project_id);
CREATE INDEX idx_aloa_project_responses_form_id ON aloa_project_responses(form_id);
CREATE INDEX idx_aloa_project_timeline_project_id ON aloa_project_timeline(project_id);
CREATE INDEX idx_aloa_project_team_email ON aloa_project_team(email);
CREATE INDEX idx_aloa_notification_queue_scheduled ON aloa_notification_queue(scheduled_for) WHERE sent_at IS NULL;

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_aloa_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_aloa_projects_updated_at BEFORE UPDATE ON aloa_projects
  FOR EACH ROW EXECUTE FUNCTION update_aloa_project_updated_at();

CREATE TRIGGER update_aloa_projectlets_updated_at BEFORE UPDATE ON aloa_projectlets
  FOR EACH ROW EXECUTE FUNCTION update_aloa_project_updated_at();

CREATE TRIGGER update_aloa_project_forms_updated_at BEFORE UPDATE ON aloa_project_forms
  FOR EACH ROW EXECUTE FUNCTION update_aloa_project_updated_at();

-- Enable Row Level Security
ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic for now, can be refined)
-- Projects visible to team members
CREATE POLICY "Aloa Projects visible to team members" ON aloa_projects
  FOR ALL USING (true); -- Will refine with auth later

CREATE POLICY "Aloa Projectlets visible to team members" ON aloa_projectlets
  FOR ALL USING (true);

CREATE POLICY "Aloa Project forms accessible" ON aloa_project_forms
  FOR ALL USING (true);

CREATE POLICY "Aloa Project responses accessible" ON aloa_project_responses
  FOR ALL USING (true);

CREATE POLICY "Aloa Timeline visible to all" ON aloa_project_timeline
  FOR SELECT USING (true);

CREATE POLICY "Aloa Team members visible" ON aloa_project_team
  FOR ALL USING (true);

CREATE POLICY "Aloa Files accessible" ON aloa_project_files
  FOR ALL USING (true);

CREATE POLICY "Aloa Notifications manageable by system" ON aloa_notification_queue
  FOR ALL USING (true);

CREATE POLICY "Aloa Achievements visible" ON aloa_project_achievements
  FOR SELECT USING (true);
