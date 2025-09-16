-- =========================================================================
-- Two-Tier Client Roles Migration (Version 2)
-- =========================================================================
-- This migration adds support for two types of client users:
-- 1. client_admin - Decision makers with full project visibility
-- 2. client_participant - Stakeholders with limited rights and feedback capability
-- =========================================================================

BEGIN;

-- Step 1: Check if user_role enum exists, if not create it with all values
DO $$
BEGIN
    -- Check if the enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Create the enum with all values including new ones
        CREATE TYPE user_role AS ENUM (
            'super_admin',
            'project_admin',
            'team_member',
            'client',           -- Keep for backward compatibility
            'client_admin',     -- New: Decision-making client
            'client_participant' -- New: Limited-access client
        );
    ELSE
        -- Enum exists, check if we need to add new values
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumtypid = 'user_role'::regtype
            AND enumlabel = 'client_admin'
        ) THEN
            -- Need to recreate the enum with new values

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

            -- Store existing policies that depend on the role column
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
            );

            -- Drop all policies on affected tables
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT DISTINCT tablename, policyname FROM temp_policies)
                LOOP
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
                END LOOP;
            END;

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
            DECLARE
                r2 RECORD;
            BEGIN
                FOR r2 IN (SELECT table_name FROM affected_tables)
                LOOP
                    -- Drop any default constraints
                    EXECUTE format('ALTER TABLE %I ALTER COLUMN role DROP DEFAULT', r2.table_name);
                    -- Change to new type
                    EXECUTE format('ALTER TABLE %I ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new', r2.table_name);
                END LOOP;
            END;

            -- Drop the old enum and rename the new one
            DROP TYPE user_role;
            ALTER TYPE user_role_new RENAME TO user_role;

            -- Re-add default for aloa_user_profiles if it exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_user_profiles') THEN
                ALTER TABLE aloa_user_profiles
                    ALTER COLUMN role SET DEFAULT 'client_participant'::user_role;
            END IF;

            -- Recreate the dropped policies
            DECLARE
                r3 RECORD;
                policy_sql TEXT;
            BEGIN
                FOR r3 IN (SELECT * FROM temp_policies)
                LOOP
                    policy_sql := format(
                        'CREATE POLICY %I ON %I AS %s FOR %s TO %s',
                        r3.policyname,
                        r3.tablename,
                        CASE WHEN r3.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                        r3.cmd,
                        array_to_string(r3.roles, ', ')
                    );

                    IF r3.qual IS NOT NULL THEN
                        policy_sql := policy_sql || format(' USING (%s)', r3.qual);
                    END IF;

                    IF r3.with_check IS NOT NULL THEN
                        policy_sql := policy_sql || format(' WITH CHECK (%s)', r3.with_check);
                    END IF;

                    EXECUTE policy_sql;
                END LOOP;
            END;

            -- Clean up temp tables
            DROP TABLE IF EXISTS temp_policies;
            DROP TABLE IF EXISTS affected_tables;
        END IF;
    END IF;
END $$;

-- Step 2: Ensure aloa_user_profiles table exists with role column
CREATE TABLE IF NOT EXISTS aloa_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role user_role DEFAULT 'client_participant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Step 3: Add feedback/rating capability fields to aloa_project_stakeholders if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_stakeholders') THEN
        ALTER TABLE aloa_project_stakeholders
            ADD COLUMN IF NOT EXISTS can_provide_feedback BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS last_feedback_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 4: Create feedback/ratings table for client participants
CREATE TABLE IF NOT EXISTS aloa_client_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    applet_id UUID,
    projectlet_id UUID,
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'comment')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Add foreign keys only if referenced tables exist
    UNIQUE(user_id, applet_id),
    UNIQUE(user_id, projectlet_id)
);

-- Add foreign keys conditionally
DO $$
BEGIN
    -- Add foreign key to aloa_projects if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_projects') THEN
        ALTER TABLE aloa_client_feedback
            ADD CONSTRAINT fk_feedback_project
            FOREIGN KEY (project_id) REFERENCES aloa_projects(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key to aloa_user_profiles if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_user_profiles') THEN
        ALTER TABLE aloa_client_feedback
            ADD CONSTRAINT fk_feedback_user
            FOREIGN KEY (user_id) REFERENCES aloa_user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key to aloa_applets if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_applets') THEN
        ALTER TABLE aloa_client_feedback
            ADD CONSTRAINT fk_feedback_applet
            FOREIGN KEY (applet_id) REFERENCES aloa_applets(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key to aloa_projectlets if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_projectlets') THEN
        ALTER TABLE aloa_client_feedback
            ADD CONSTRAINT fk_feedback_projectlet
            FOREIGN KEY (projectlet_id) REFERENCES aloa_projectlets(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_client_feedback_project ON aloa_client_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_user ON aloa_client_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_created ON aloa_client_feedback(created_at DESC);

-- Step 5: Add permission flags for client admin vs participant distinction
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_members') THEN
        ALTER TABLE aloa_project_members
            ADD COLUMN IF NOT EXISTS can_view_all_sections BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS can_submit_forms BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS can_view_other_responses BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS can_provide_feedback BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS restricted_sections JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Step 6: Create view for easy permission checking (only if tables exist)
DO $$
DECLARE
    has_status_column BOOLEAN;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_members')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_user_profiles') THEN

        -- Check if status column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'aloa_project_members'
            AND column_name = 'status'
        ) INTO has_status_column;

        IF has_status_column THEN
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
        ELSE
            -- Create view without status filter
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
            JOIN aloa_user_profiles up ON pm.user_id = up.id;
        END IF;
    END IF;
END $$;

-- Step 7: Update existing client users to client_admin for backward compatibility
UPDATE aloa_user_profiles
SET role = 'client_admin'
WHERE role = 'client'
AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'client_admin');

-- Step 8: Set appropriate permissions for existing project members based on new roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_members') THEN
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
    END IF;
END $$;

-- Step 9: Add helper function for permission checking
CREATE OR REPLACE FUNCTION check_user_project_permission(
    p_user_id UUID,
    p_project_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Only run if the view exists
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_project_permissions') THEN
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
    ELSE
        v_has_permission := false;
    END IF;

    RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add RLS policies for the new feedback table
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
        ) OR NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'aloa_project_members'
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
        ) OR NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'aloa_user_profiles'
        )
    );

COMMIT;

-- =========================================================================
-- Migration Complete!
-- =========================================================================
-- This migration is safe to run multiple times (idempotent)
-- It checks for existence of tables and columns before making changes
-- =========================================================================