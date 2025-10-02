-- Add Client Notifications Table
-- This migration creates a table for storing client-side notifications
-- Generated on 2025-10-01

-- Create the notifications table for client users
CREATE TABLE IF NOT EXISTS aloa_client_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- new_task, task_unlocked, approval_received, revision_requested, deadline_reminder, message, milestone_complete
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    applet_id UUID REFERENCES aloa_applets(id) ON DELETE SET NULL,
    projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for performance
    CONSTRAINT aloa_client_notifications_type_check CHECK (type IN (
        'new_task',
        'task_unlocked',
        'approval_received',
        'revision_requested',
        'deadline_reminder',
        'message',
        'milestone_complete',
        'general'
    ))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_client_notifications_project_user
    ON aloa_client_notifications(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created
    ON aloa_client_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notifications_read
    ON aloa_client_notifications(read);
CREATE INDEX IF NOT EXISTS idx_client_notifications_type
    ON aloa_client_notifications(type);
CREATE INDEX IF NOT EXISTS idx_client_notifications_applet
    ON aloa_client_notifications(applet_id) WHERE applet_id IS NOT NULL;

- Enable Row Level Security
ALTER TABLE aloa_client_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they already exist to avoid duplicates
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'aloa_client_notifications'
          AND policyname = 'Users can read own notifications'
    ) THEN
        EXECUTE 'DROP POLICY "Users can read own notifications" ON aloa_client_notifications';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'aloa_client_notifications'
          AND policyname = 'Users can update own notifications'
    ) THEN
        EXECUTE 'DROP POLICY "Users can update own notifications" ON aloa_client_notifications';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'aloa_client_notifications'
          AND policyname = 'Users can delete own notifications'
    ) THEN
        EXECUTE 'DROP POLICY "Users can delete own notifications" ON aloa_client_notifications';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'aloa_client_notifications'
          AND policyname = 'Admins can create notifications'
    ) THEN
        EXECUTE 'DROP POLICY "Admins can create notifications" ON aloa_client_notifications';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'aloa_client_notifications'
          AND policyname = 'Admins can manage project notifications'
    ) THEN
        EXECUTE 'DROP POLICY "Admins can manage project notifications" ON aloa_client_notifications';
    END IF;
END $$;

-- RLS Policies

CREATE POLICY "Users can read own notifications"
    ON aloa_client_notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
    ON aloa_client_notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles
            WHERE id = auth.uid()
            AND role IN ('super_admin', 'project_admin', 'team_member')
        )
    );

CREATE POLICY "Users can update own notifications"
    ON aloa_client_notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
    ON aloa_client_notifications FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage project notifications"
    ON aloa_client_notifications FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('super_admin', 'project_admin', 'team_member')
        )
        AND
        EXISTS (
            SELECT 1 FROM aloa_project_members pm
            WHERE pm.project_id = aloa_client_notifications.project_id
            AND pm.user_id = auth.uid()
            AND pm.project_role IN ('owner', 'admin', 'member')
        )
    );

-- Create a function to automatically create notifications
CREATE OR REPLACE FUNCTION notify_client(
    p_project_id UUID,
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_applet_id UUID DEFAULT NULL,
    p_projectlet_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO aloa_client_notifications (
        project_id,
        user_id,
        type,
        title,
        message,
        applet_id,
        projectlet_id,
        data
    ) VALUES (
        p_project_id,
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_applet_id,
        p_projectlet_id,
        p_data
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Create a trigger to auto-create notifications when applets are unlocked or assigned
CREATE OR REPLACE FUNCTION auto_notify_on_applet_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
    v_projectlet_name TEXT;
    v_client_users RECORD;
BEGIN
    -- Only proceed if the applet is being unlocked (config.locked changed from true to false)
    IF (OLD.config->>'locked' = 'true' AND NEW.config->>'locked' = 'false') OR
       (OLD.config->>'locked' IS NULL AND NEW.config->>'locked' = 'false') THEN

        -- Get project ID and projectlet name
        SELECT p.project_id, pl.name INTO v_project_id, v_projectlet_name
        FROM aloa_applets a
        JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
        JOIN aloa_projects p ON pl.project_id = p.id
        WHERE a.id = NEW.id;

        -- Notify all client users in the project
        FOR v_client_users IN
            SELECT DISTINCT up.id as user_id
            FROM aloa_user_profiles up
            JOIN aloa_project_members pm ON up.id = pm.user_id
            WHERE pm.project_id = v_project_id
            AND up.role IN ('client', 'client_admin', 'client_participant')
        LOOP
            PERFORM notify_client(
                v_project_id,
                v_client_users.user_id,
                'task_unlocked',
                'New Task Available!',
                format('"%s" in %s is now ready for your input', NEW.name, v_projectlet_name),
                NEW.id,
                NEW.projectlet_id,
                jsonb_build_object('auto_generated', true)
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on applets table
CREATE TRIGGER trigger_notify_applet_unlock
    AFTER UPDATE ON aloa_applets
    FOR EACH ROW
    WHEN (OLD.config IS DISTINCT FROM NEW.config)
    EXECUTE FUNCTION auto_notify_on_applet_change();

-- Create a function to notify clients when new applets are created
CREATE OR REPLACE FUNCTION auto_notify_on_new_applet()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
    v_projectlet_name TEXT;
    v_client_users RECORD;
BEGIN
    -- Skip if applet is created in locked state
    IF NEW.config->>'locked' = 'true' THEN
        RETURN NEW;
    END IF;

    -- Get project ID and projectlet name
    SELECT p.project_id, pl.name INTO v_project_id, v_projectlet_name
    FROM aloa_projectlets pl
    JOIN aloa_projects p ON pl.project_id = p.id
    WHERE pl.id = NEW.projectlet_id;

    -- Notify all client users in the project
    FOR v_client_users IN
        SELECT DISTINCT up.id as user_id
        FROM aloa_user_profiles up
        JOIN aloa_project_members pm ON up.id = pm.user_id
        WHERE pm.project_id = v_project_id
        AND up.role IN ('client', 'client_admin', 'client_participant')
    LOOP
        PERFORM notify_client(
            v_project_id,
            v_client_users.user_id,
            'new_task',
            'New Task Assigned!',
            format('Please complete "%s" in %s', NEW.name, v_projectlet_name),
            NEW.id,
            NEW.projectlet_id,
            jsonb_build_object('auto_generated', true)
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- Create trigger for new applets
CREATE TRIGGER trigger_notify_new_applet
    AFTER INSERT ON aloa_applets
    FOR EACH ROW
    EXECUTE FUNCTION auto_notify_on_new_applet();

-- Update function for marking notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE aloa_client_notifications
    SET read = true,
        updated_at = NOW()
    WHERE id = p_notification_id
    AND user_id = p_user_id;

    RETURN FOUND;
END;
$$;

-- Add comment to the table
COMMENT ON TABLE aloa_client_notifications IS 'Stores notifications for client users about project activities and required actions';
