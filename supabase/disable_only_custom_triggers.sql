-- Disable only custom triggers (not system triggers)

-- 1. First, identify and drop the problematic triggers by name
DROP TRIGGER IF EXISTS extract_applet_interaction_knowledge_trigger ON aloa_applet_interactions;
DROP TRIGGER IF EXISTS extract_applet_config_knowledge_trigger ON aloa_applets;

-- 2. Drop the functions that are causing issues
DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE;
DROP FUNCTION IF EXISTS extract_applet_config_knowledge() CASCADE;

-- 3. Check what triggers remain
SELECT
    c.relname as table_name,
    t.tgname as trigger_name,
    CASE
        WHEN t.tgname LIKE 'RI_%' THEN 'System (Foreign Key)'
        ELSE 'Custom'
    END as trigger_type,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('aloa_applets', 'aloa_applet_interactions')
ORDER BY c.relname, t.tgname;

-- 4. Test creating an applet
DO $$
DECLARE
    test_projectlet_id UUID := 'aa6fde15-f4b3-42c5-a654-4790fd2bc045';
    new_applet_id UUID;
BEGIN
    INSERT INTO aloa_applets (
        projectlet_id,
        name,
        type,
        order_index,
        config,
        form_id,
        description,
        client_instructions
    ) VALUES (
        test_projectlet_id,
        'Test Client Review After Trigger Removal',
        'client_review',
        999,
        '{"header": "Review & Approve", "description": "Please review", "locked": false, "max_revisions": 2}'::jsonb,
        NULL,
        'Request client approval for completed work',
        'Review and approve or request revisions'
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE '✅ SUCCESS! Created client_review applet: %', new_applet_id;
    RAISE NOTICE 'Applets should work now!';

    -- Clean up
    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Test applet cleaned up';

EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- 5. Show final status
SELECT
    'Knowledge extraction triggers have been removed' as action,
    'Applets should now work without errors' as status,
    'You can add them from the library modal' as next_step;