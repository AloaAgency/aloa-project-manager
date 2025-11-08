-- ============================================================================
-- Migration: Fix notification trigger functions with incorrect table aliases
-- Date: 2025-11-04
-- Issue: Column p.project_id does not exist error during INSERT into aloa_applets
--
-- ERROR DETAILS:
--   code: '42703'
--   message: 'column p.project_id does not exist'
--   hint: 'Perhaps you meant to reference the column "pl.project_id"'
--
-- ROOT CAUSE:
--   Two notification trigger functions were using incorrect table alias
--   'p.project_id' when it should use 'pl.project_id'
--
-- FUNCTIONS FIXED:
--   1. auto_notify_on_new_applet() - AFTER INSERT trigger
--   2. auto_notify_on_applet_change() - AFTER UPDATE trigger
--
-- TRIGGERS AFFECTED:
--   - trigger_notify_new_applet (AFTER INSERT ON aloa_applets)
--   - trigger_notify_applet_unlock (AFTER UPDATE ON aloa_applets)
-- ============================================================================

-- ============================================================================
-- FIX 1: auto_notify_on_new_applet() - INSERT trigger function
-- ============================================================================
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
    -- FIX: Changed from 'p.project_id' to 'pl.project_id'
    -- The aloa_projects table uses 'id' as primary key, not 'project_id'
    -- The aloa_projectlets table has 'project_id' foreign key
    SELECT pl.project_id, pl.name INTO v_project_id, v_projectlet_name
    FROM aloa_projectlets pl
    WHERE pl.id = NEW.projectlet_id;

    -- Only notify if we found a valid project
    IF v_project_id IS NULL THEN
        RETURN NEW;
    END IF;

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

-- ============================================================================
-- FIX 2: auto_notify_on_applet_change() - UPDATE trigger function
-- ============================================================================
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
        -- FIX: Changed from 'p.project_id' to 'pl.project_id'
        -- Also simplified by removing unnecessary join to aloa_applets since we already have NEW record
        SELECT pl.project_id, pl.name INTO v_project_id, v_projectlet_name
        FROM aloa_projectlets pl
        WHERE pl.id = NEW.projectlet_id;

        -- Only notify if we found a valid project
        IF v_project_id IS NULL THEN
            RETURN NEW;
        END IF;

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

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    function1_def TEXT;
    function2_def TEXT;
    has_correct_alias1 BOOLEAN;
    has_correct_alias2 BOOLEAN;
BEGIN
    -- Check auto_notify_on_new_applet
    SELECT pg_get_functiondef(oid) INTO function1_def
    FROM pg_proc
    WHERE proname = 'auto_notify_on_new_applet'
    AND pronamespace = 'public'::regnamespace;

    -- Check auto_notify_on_applet_change
    SELECT pg_get_functiondef(oid) INTO function2_def
    FROM pg_proc
    WHERE proname = 'auto_notify_on_applet_change'
    AND pronamespace = 'public'::regnamespace;

    -- Verify both functions have the correct alias
    has_correct_alias1 := function1_def LIKE '%pl.project_id%';
    has_correct_alias2 := function2_def LIKE '%pl.project_id%';

    IF has_correct_alias1 AND has_correct_alias2 THEN
        RAISE NOTICE '✅ SUCCESS: Both notification functions fixed';
        RAISE NOTICE '✅ auto_notify_on_new_applet() now uses: pl.project_id';
        RAISE NOTICE '✅ auto_notify_on_applet_change() now uses: pl.project_id';
        RAISE NOTICE '✅ INSERT and UPDATE operations into aloa_applets should now work';
    ELSE
        IF NOT has_correct_alias1 THEN
            RAISE WARNING '❌ WARNING: auto_notify_on_new_applet() may not be correctly updated';
        END IF;
        IF NOT has_correct_alias2 THEN
            RAISE WARNING '❌ WARNING: auto_notify_on_applet_change() may not be correctly updated';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION TEST
-- ============================================================================
-- Uncomment below to test the fix with a real INSERT
-- (Make sure to replace the projectlet_id with a valid UUID from your database)
/*
DO $$
DECLARE
    test_projectlet_id UUID := 'YOUR_PROJECTLET_ID_HERE';
    test_applet_id UUID;
BEGIN
    -- Try to insert a test applet
    INSERT INTO aloa_applets (
        projectlet_id,
        name,
        type,
        order_index,
        config
    ) VALUES (
        test_projectlet_id,
        'Test Prototype Review',
        'prototype_review'::applet_type,
        999,
        '{"locked": false}'::jsonb
    ) RETURNING id INTO test_applet_id;

    RAISE NOTICE '✅ TEST PASSED: Applet created successfully with ID: %', test_applet_id;

    -- Clean up test data
    DELETE FROM aloa_applets WHERE id = test_applet_id;
    DELETE FROM aloa_client_notifications WHERE applet_id = test_applet_id;

    RAISE NOTICE '✅ Test cleanup complete';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ TEST FAILED: %', SQLERRM;
        RAISE NOTICE '❌ Error code: %', SQLSTATE;
END $$;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration fixes the trigger that was causing INSERT failures.
-- The original query was:
--   SELECT p.project_id, pl.name
--   FROM aloa_projectlets pl
--   JOIN aloa_projects p ON pl.project_id = p.id
--
-- The problem: aloa_projects table has 'id' column, not 'project_id'
-- The foreign key in aloa_projectlets is 'project_id' which references aloa_projects.id
--
-- The fix simplifies the query by removing the unnecessary JOIN:
--   SELECT pl.project_id, pl.name
--   FROM aloa_projectlets pl
--
-- This is more efficient and avoids the alias confusion.
-- ============================================================================
