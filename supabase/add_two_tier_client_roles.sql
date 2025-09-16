-- =========================================================================
-- Two-Tier Client Roles Migration
-- =========================================================================
-- This migration adds support for two types of client users:
-- 1. client_admin - Decision makers with full project visibility
-- 2. client_participant - Stakeholders with limited rights and feedback capability
-- =========================================================================

-- Step 1: Add new user role values to the enum
-- Note: PostgreSQL doesn't allow direct ALTER TYPE ADD VALUE in a transaction,
-- so we need to create a new type and migrate
BEGIN;

-- Find all tables that have a 'role' column with the user_role type
CREATE TEMP TABLE affected_tables AS
SELECT DISTINCT
    c.table_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE c.column_name = 'role'
AND c.udt_name = 'user_role'
AND t.table_type = 'BASE TABLE'
AND t.table_schema = 'public';

-- Store existing policies that depend on the role column from any table
CREATE TEMP TABLE temp_policies AS
SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
FROM pg_policies p
WHERE EXISTS (
    SELECT 1 FROM affected_tables a
    WHERE a.table_name = p.tablename
)
AND (p.qual::text LIKE '%role%' OR p.with_check::text LIKE '%role%');

-- Drop all policies on affected tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT DISTINCT tablename, policyname FROM temp_policies)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Create new enum type with additional roles
CREATE TYPE user_role_new AS ENUM (
    'super_admin',
    'project_admin',
    'team_member',
    'client',           -- Keep for backward compatibility
    'client_admin',     -- New: Decision-making client
    'client_participant' -- New: Limited-access client
);

-- Update all tables with role columns to use the new enum type
DO $$
DECLARE
    r RECORD;
BEGIN
    -- First drop any default constraints on role columns
    FOR r IN (SELECT table_name FROM affected_tables)
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN role DROP DEFAULT', r.table_name);
    END LOOP;

    -- Then update all role columns to the new type
    FOR r IN (SELECT table_name FROM affected_tables)
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new', r.table_name);
    END LOOP;
END $$;

-- Drop the old enum and rename the new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Re-add the default constraint with the new type
ALTER TABLE aloa_user_profiles
    ALTER COLUMN role SET DEFAULT 'client_participant'::user_role;

-- Recreate the dropped policies
DO $$
DECLARE
    r RECORD;
    policy_sql TEXT;
BEGIN
    FOR r IN (SELECT * FROM temp_policies)
    LOOP
        policy_sql := format(
            'CREATE POLICY %I ON %I AS %s FOR %s TO %s',
            r.policyname,
            r.tablename,
            CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
            r.cmd,
            array_to_string(r.roles, ', ')
        );

        IF r.qual IS NOT NULL THEN
            policy_sql := policy_sql || format(' USING (%s)', r.qual);
        END IF;

        IF r.with_check IS NOT NULL THEN
            policy_sql := policy_sql || format(' WITH CHECK (%s)', r.with_check);
        END IF;

        EXECUTE policy_sql;
    END LOOP;
END $$;

-- Clean up
DROP TABLE temp_policies;
DROP TABLE affected_tables;

-- Step 2: Add feedback/rating capability fields
ALTER TABLE aloa_project_stakeholders
    ADD COLUMN IF NOT EXISTS can_provide_feedback BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_feedback_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0;

-- Step 3: Create feedback/ratings table for client participants
CREATE TABLE IF NOT EXISTS aloa_client_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,
    applet_id UUID REFERENCES aloa_applets(id) ON DELETE CASCADE,
    projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'comment')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one feedback per user per item
    UNIQUE(user_id, applet_id),
    UNIQUE(user_id, projectlet_id)
);

-- Create index for efficient queries
CREATE INDEX idx_client_feedback_project ON aloa_client_feedback(project_id);
CREATE INDEX idx_client_feedback_user ON aloa_client_feedback(user_id);
CREATE INDEX idx_client_feedback_created ON aloa_client_feedback(created_at DESC);

-- Step 4: Add permission flags for client admin vs participant distinction
ALTER TABLE aloa_project_members
    ADD COLUMN IF NOT EXISTS can_view_all_sections BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_submit_forms BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_other_responses BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_provide_feedback BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS restricted_sections JSONB DEFAULT '[]'::jsonb;

-- Step 5: Create view for easy permission checking
CREATE OR REPLACE VIEW user_project_permissions AS
SELECT
    pm.project_id,
    pm.user_id,
    up.role as user_role,
    pm.project_role,
    pm.can_view_all_sections,
    pm.can_submit_forms,
    pm.can_view_other_responses,
    pm.can_provide_feedback,
    pm.restricted_sections,
    CASE
        WHEN up.role = 'client_admin' THEN true
        WHEN up.role = 'client_participant' THEN false
        WHEN up.role = 'client' THEN true  -- Legacy clients treated as admin
        ELSE true
    END as is_decision_maker
FROM aloa_project_members pm
JOIN aloa_user_profiles up ON pm.user_id = up.id
WHERE pm.status = 'active';

-- Step 6: Update existing client users to client_admin for backward compatibility
UPDATE aloa_user_profiles
SET role = 'client_admin'
WHERE role = 'client';

-- Step 7: Set appropriate permissions for existing project members based on new roles
UPDATE aloa_project_members pm
SET
    can_view_all_sections = CASE
        WHEN up.role IN ('client_admin', 'super_admin', 'project_admin', 'team_member') THEN true
        ELSE false
    END,
    can_view_other_responses = CASE
        WHEN up.role IN ('client_admin', 'super_admin', 'project_admin') THEN true
        ELSE false
    END,
    can_provide_feedback = CASE
        WHEN up.role = 'client_participant' THEN true
        ELSE false
    END
FROM aloa_user_profiles up
WHERE pm.user_id = up.id;

-- Step 8: Add helper functions for permission checking
CREATE OR REPLACE FUNCTION check_user_project_permission(
    p_user_id UUID,
    p_project_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT
        CASE p_permission
            WHEN 'view_all_sections' THEN can_view_all_sections
            WHEN 'submit_forms' THEN can_submit_forms
            WHEN 'view_other_responses' THEN can_view_other_responses
            WHEN 'provide_feedback' THEN can_provide_feedback
            WHEN 'is_decision_maker' THEN is_decision_maker
            ELSE false
        END INTO v_has_permission
    FROM user_project_permissions
    WHERE user_id = p_user_id AND project_id = p_project_id;

    RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add RLS policies for the new feedback table
ALTER TABLE aloa_client_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY client_feedback_insert ON aloa_client_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view feedback for projects they're members of
CREATE POLICY client_feedback_select ON aloa_client_feedback
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM aloa_project_members pm
            WHERE pm.project_id = aloa_client_feedback.project_id
            AND pm.user_id = auth.uid()
            AND pm.status = 'active'
        )
    );

-- Policy: Users can update their own feedback
CREATE POLICY client_feedback_update ON aloa_client_feedback
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Only project/super admins can delete feedback
CREATE POLICY client_feedback_delete ON aloa_client_feedback
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('super_admin', 'project_admin')
        )
    );

-- Step 10: Add trigger to update feedback count in stakeholders table
CREATE OR REPLACE FUNCTION update_stakeholder_feedback_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE aloa_project_stakeholders
        SET
            feedback_count = feedback_count + 1,
            last_feedback_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE aloa_project_stakeholders
        SET feedback_count = feedback_count - 1
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_count
AFTER INSERT OR DELETE ON aloa_client_feedback
FOR EACH ROW
EXECUTE FUNCTION update_stakeholder_feedback_count();

COMMIT;

-- =========================================================================
-- Migration Complete!
-- =========================================================================
-- To rollback this migration, run:
-- 1. DROP TABLE aloa_client_feedback CASCADE;
-- 2. DROP FUNCTION check_user_project_permission;
-- 3. DROP VIEW user_project_permissions;
-- 4. Remove added columns from aloa_project_members and aloa_project_stakeholders
-- 5. Revert enum type changes (complex - requires creating new type)
-- =========================================================================