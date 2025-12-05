-- ============================================================
-- Communications System: Core Tables, Indexes, Triggers, RLS
-- ============================================================

-- ------------------------------------------------------------
-- Table: aloa_communications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE SET NULL,
    applet_id UUID REFERENCES aloa_applets(id) ON DELETE SET NULL,

    -- Direction and ownership
    direction TEXT NOT NULL CHECK (direction IN ('admin_to_client', 'client_to_admin')),
    created_by UUID NOT NULL REFERENCES aloa_user_profiles(id),
    assigned_to UUID[] DEFAULT '{}'::UUID[],

    -- Content
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'review_request',
        'approval_request',
        'feedback_request',
        'document_request',
        'decision_request',
        'action_required',
        'change_request',
        'issue_report',
        'question',
        'new_requirement',
        'status_inquiry',
        'general'
    )),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',
        'acknowledged',
        'in_progress',
        'pending_review',
        'completed',
        'declined',
        'on_hold'
    )),

    -- Priority and timing
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,

    -- Attachments and metadata
    attachments JSONB DEFAULT '[]'::jsonb,
    form_response_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_communications_project ON aloa_communications(project_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON aloa_communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_direction ON aloa_communications(direction);
CREATE INDEX IF NOT EXISTS idx_communications_created_by ON aloa_communications(created_by);
CREATE INDEX IF NOT EXISTS idx_communications_due_date ON aloa_communications(due_date);

-- ------------------------------------------------------------
-- Table: aloa_communication_messages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES aloa_communications(id) ON DELETE CASCADE,

    -- Author
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id),
    is_admin BOOLEAN NOT NULL,

    -- Content
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Message type for special formatting
    message_type TEXT DEFAULT 'comment' CHECK (message_type IN (
        'comment',
        'status_update',
        'attachment',
        'mention'
    )),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_comm_messages_communication ON aloa_communication_messages(communication_id);
CREATE INDEX IF NOT EXISTS idx_comm_messages_user ON aloa_communication_messages(user_id);

-- ------------------------------------------------------------
-- Table: aloa_communication_read_status
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_communication_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES aloa_communications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,

    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_count INTEGER DEFAULT 0,

    UNIQUE (communication_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_read_user ON aloa_communication_read_status(user_id);

-- ------------------------------------------------------------
-- Table: aloa_communication_templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('admin_to_client', 'client_to_admin')),
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'restricted')),
    category TEXT NOT NULL CHECK (category IN (
        'review_request',
        'approval_request',
        'feedback_request',
        'document_request',
        'decision_request',
        'action_required',
        'change_request',
        'issue_report',
        'question',
        'new_requirement',
        'status_inquiry',
        'general'
    )),

    -- Template content
    default_title TEXT,
    default_description TEXT,
    default_priority TEXT DEFAULT 'medium',

    -- Optional form attachment
    form_id UUID REFERENCES aloa_forms(id),

    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates are global by default; set scope = 'restricted' and add assignment rows
-- to curate which projects/clients can see a given template.

-- ------------------------------------------------------------
-- Table: aloa_communication_template_assignments
-- Optional per-project curation for restricted templates
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_communication_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES aloa_communication_templates(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (template_id, project_id)
);

-- ------------------------------------------------------------
-- Timestamp helper functions & triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION aloa_set_communication_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    IF NEW.status = 'acknowledged' AND OLD.status IS DISTINCT FROM 'acknowledged' AND OLD.acknowledged_at IS NULL THEN
        NEW.acknowledged_at = NOW();
    END IF;

    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND OLD.completed_at IS NULL THEN
        NEW.completed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aloa_communications_set_timestamps ON aloa_communications;
CREATE TRIGGER trg_aloa_communications_set_timestamps
BEFORE UPDATE ON aloa_communications
FOR EACH ROW
EXECUTE FUNCTION aloa_set_communication_timestamps();

CREATE OR REPLACE FUNCTION aloa_set_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF (NEW.message IS DISTINCT FROM OLD.message) OR (NEW.attachments IS DISTINCT FROM OLD.attachments) THEN
        NEW.is_edited = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aloa_communication_messages_set_updated_at ON aloa_communication_messages;
CREATE TRIGGER trg_aloa_communication_messages_set_updated_at
BEFORE UPDATE ON aloa_communication_messages
FOR EACH ROW
EXECUTE FUNCTION aloa_set_message_updated_at();

-- ------------------------------------------------------------
-- RLS Enablement
-- ------------------------------------------------------------
ALTER TABLE aloa_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_template_assignments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS Policies
-- ------------------------------------------------------------

-- Communications: users can view communications for their projects or ones they created
CREATE POLICY "Users can view communications for their projects"
ON aloa_communications FOR SELECT
USING (
    project_id IN (
        SELECT project_id FROM aloa_project_members
        WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
);

-- Admins can create any communication; clients can create client_to_admin for their projects
CREATE POLICY "Admins can create communications"
ON aloa_communications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
    OR (
        direction = 'client_to_admin'
        AND project_id IN (
            SELECT project_id FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    )
);

-- Users can update communications they created or are assigned to; admins override
CREATE POLICY "Users can update relevant communications"
ON aloa_communications FOR UPDATE
USING (
    created_by = auth.uid()
    OR auth.uid() = ANY(assigned_to)
    OR EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
)
WITH CHECK (
    created_by = auth.uid()
    OR auth.uid() = ANY(assigned_to)
    OR EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Admins can delete communications (soft delete enforced in app layer)
CREATE POLICY "Admins can delete communications"
ON aloa_communications FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Messages: members can view messages for their projects
CREATE POLICY "Users can view messages for their projects"
ON aloa_communication_messages FOR SELECT
USING (
    communication_id IN (
        SELECT id FROM aloa_communications
        WHERE project_id IN (
            SELECT project_id FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    )
);

-- Messages: members can insert messages for their projects
CREATE POLICY "Users can insert messages for their projects"
ON aloa_communication_messages FOR INSERT
WITH CHECK (
    communication_id IN (
        SELECT id FROM aloa_communications
        WHERE project_id IN (
            SELECT project_id FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    )
);

-- Messages: authors can update their own; admins override
CREATE POLICY "Authors or admins can update messages"
ON aloa_communication_messages FOR UPDATE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Read status: per-user access only
CREATE POLICY "Users can view their own read status"
ON aloa_communication_read_status FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own read status"
ON aloa_communication_read_status FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
ON aloa_communication_read_status FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Templates: members can read active templates (global or assigned)
CREATE POLICY "Project members can read active templates"
ON aloa_communication_templates FOR SELECT
USING (
    is_active = TRUE
    AND (
        scope = 'global'
        OR id IN (
            SELECT template_id FROM aloa_communication_template_assignments
            WHERE project_id IN (
                SELECT project_id FROM aloa_project_members
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- Templates: admins/team can manage
CREATE POLICY "Admins can manage templates"
ON aloa_communication_templates FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- Template assignments: admins manage per-project curation
CREATE POLICY "Admins can manage template assignments"
ON aloa_communication_template_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
);
