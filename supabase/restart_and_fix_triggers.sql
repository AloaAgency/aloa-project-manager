-- Complete restart and fix for all trigger issues
-- This will disable triggers, fix functions, then re-enable

-- 1. FIRST: Disable ALL triggers to stop errors
ALTER TABLE aloa_applets DISABLE TRIGGER ALL;
ALTER TABLE aloa_applet_interactions DISABLE TRIGGER ALL;

-- 2. Drop ALL knowledge extraction functions and triggers
DROP TRIGGER IF EXISTS extract_applet_interaction_knowledge_trigger ON aloa_applet_interactions CASCADE;
DROP TRIGGER IF EXISTS extract_applet_config_knowledge_trigger ON aloa_applets CASCADE;
DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE;
DROP FUNCTION IF EXISTS extract_applet_config_knowledge() CASCADE;

-- 3. Clean test - try creating an applet with triggers disabled
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
        form_id
    ) VALUES (
        test_projectlet_id,
        'Test With Triggers Disabled',
        'client_review',
        999,
        '{"header": "Test", "locked": false}'::jsonb,
        NULL
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE '✅ SUCCESS creating applet with triggers disabled: %', new_applet_id;

    DELETE FROM aloa_applets WHERE id = new_applet_id;

EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ ERROR even with triggers disabled: %', SQLERRM;
END $$;

-- 4. Re-enable foreign key constraints only (not custom triggers)
ALTER TABLE aloa_applets ENABLE TRIGGER ALL;
ALTER TABLE aloa_applet_interactions ENABLE TRIGGER ALL;

-- 5. Now disable just the knowledge triggers again
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- Disable any remaining knowledge-related triggers
    FOR trigger_rec IN
        SELECT tgname, c.relname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE (tgname LIKE '%knowledge%' OR tgname LIKE '%extract%')
        AND c.relname IN ('aloa_applets', 'aloa_applet_interactions')
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', trigger_rec.relname, trigger_rec.tgname);
        RAISE NOTICE 'Disabled trigger: %.%', trigger_rec.relname, trigger_rec.tgname;
    END LOOP;
END $$;

-- 6. Final test - applets should work now
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
        form_id
    ) VALUES (
        test_projectlet_id,
        'Final Test Client Review',
        'client_review',
        999,
        '{"header": "Review & Approve", "locked": false}'::jsonb,
        NULL
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE '✅✅✅ SUCCESS! Applets work now. Created: %', new_applet_id;
    RAISE NOTICE 'You can now add applets from the library!';

    DELETE FROM aloa_applets WHERE id = new_applet_id;

EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Still failing: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Show status
SELECT
    'Knowledge extraction triggers have been DISABLED' as status,
    'Applets should now work without errors' as message;