-- Check for any triggers on aloa_applets table that might be causing the issue
-- Run this in Supabase SQL editor to diagnose the problem

-- 1. Show all columns in aloa_applets table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'aloa_applets'
ORDER BY ordinal_position;

-- 2. Check if there are any triggers on aloa_applets
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'aloa_applets';

-- 3. Check if there's a function trying to use project_id
SELECT
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE prosrc LIKE '%project_id%'
AND prosrc LIKE '%aloa_applets%';

-- 4. Try to manually insert a client_review applet to see the exact error
DO $$
DECLARE
    test_projectlet_id UUID;
BEGIN
    -- Get a real projectlet ID
    SELECT id INTO test_projectlet_id
    FROM aloa_projectlets
    WHERE id = 'aa6fde15-f4b3-42c5-a654-4790fd2bc045'
    LIMIT 1;

    IF test_projectlet_id IS NOT NULL THEN
        -- Try to insert
        INSERT INTO aloa_applets (
            projectlet_id,
            name,
            type,
            order_index,
            config,
            form_id
        ) VALUES (
            test_projectlet_id,
            'Test Client Review Manual',
            'client_review',
            999,
            '{"header": "Review & Approve", "description": "Test", "locked": false, "max_revisions": 2}'::jsonb,
            NULL
        );

        RAISE NOTICE 'Successfully inserted client_review applet!';

        -- Clean up
        DELETE FROM aloa_applets
        WHERE name = 'Test Client Review Manual'
        AND type = 'client_review';

        RAISE NOTICE 'Test cleaned up';
    ELSE
        RAISE NOTICE 'No projectlet found';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error inserting applet: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;