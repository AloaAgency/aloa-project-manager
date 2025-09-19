-- Fix the issue with project_id field not existing
-- This appears to be related to a trigger trying to extract knowledge

-- 1. First, check if there's a knowledge extraction trigger on aloa_applets
SELECT
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'aloa_applets'::regclass;

-- 2. If there's a trigger that references project_id, we need to fix it
-- The issue is that aloa_applets doesn't have a direct project_id field
-- It has projectlet_id, and we need to join through aloa_projectlets to get project_id

-- 3. Let's check if there's a function that needs fixing
SELECT prosrc
FROM pg_proc
WHERE proname LIKE '%applet%knowledge%'
   OR proname LIKE '%extract%applet%';

-- 4. Temporarily disable any problematic triggers (if they exist)
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- Find triggers on aloa_applets
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'aloa_applets'::regclass
        AND tgname LIKE '%knowledge%'
    LOOP
        EXECUTE format('ALTER TABLE aloa_applets DISABLE TRIGGER %I', trigger_rec.tgname);
        RAISE NOTICE 'Disabled trigger: %', trigger_rec.tgname;
    END LOOP;
END $$;

-- 5. Now try to insert a client_review applet
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
        'Test Client Review',
        'client_review',
        999,
        '{"header": "Review & Approve", "description": "Test", "locked": false, "max_revisions": 2}'::jsonb,
        NULL,
        'Request client approval for completed work',
        'Review and approve or request revisions'
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE 'Successfully created client_review applet with ID: %', new_applet_id;

    -- Clean up
    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Test applet cleaned up';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 6. Re-enable triggers if they were disabled
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'aloa_applets'::regclass
        AND tgname LIKE '%knowledge%'
    LOOP
        EXECUTE format('ALTER TABLE aloa_applets ENABLE TRIGGER %I', trigger_rec.tgname);
        RAISE NOTICE 'Re-enabled trigger: %', trigger_rec.tgname;
    END LOOP;
END $$;