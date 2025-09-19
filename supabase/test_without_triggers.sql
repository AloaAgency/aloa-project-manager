-- Test creating a client_review applet with ALL triggers disabled
-- This will help us determine if the issue is trigger-related or something else

DO $$
DECLARE
    test_projectlet_id UUID := 'aa6fde15-f4b3-42c5-a654-4790fd2bc045';
    new_applet_id UUID;
    trigger_rec RECORD;
BEGIN
    -- 1. Disable ALL triggers on aloa_applets
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'aloa_applets'::regclass
        AND tgname NOT LIKE 'RI_%'  -- Keep foreign key constraints
    LOOP
        EXECUTE format('ALTER TABLE aloa_applets DISABLE TRIGGER %I', trigger_rec.tgname);
        RAISE NOTICE 'Disabled trigger on aloa_applets: %', trigger_rec.tgname;
    END LOOP;

    -- 2. Disable ALL triggers on aloa_applet_interactions
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'aloa_applet_interactions'::regclass
        AND tgname NOT LIKE 'RI_%'  -- Keep foreign key constraints
    LOOP
        EXECUTE format('ALTER TABLE aloa_applet_interactions DISABLE TRIGGER %I', trigger_rec.tgname);
        RAISE NOTICE 'Disabled trigger on aloa_applet_interactions: %', trigger_rec.tgname;
    END LOOP;

    -- 3. Try to insert a client_review applet
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
        'Test Client Review (No Triggers)',
        'client_review',
        999,
        '{"header": "Review & Approve", "description": "Testing without triggers", "locked": false, "max_revisions": 2}'::jsonb,
        NULL,
        'Request client approval for completed work',
        'Review and approve or request revisions'
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE '✅ SUCCESS! Created client_review applet with ID: %', new_applet_id;

    -- Show the created applet
    PERFORM * FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Applet exists in database';

    -- 4. Clean up the test applet
    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Test applet cleaned up';

    -- 5. Re-enable all triggers on aloa_applets
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'aloa_applets'::regclass
        AND tgname NOT LIKE 'RI_%'
    LOOP
        EXECUTE format('ALTER TABLE aloa_applets ENABLE TRIGGER %I', trigger_rec.tgname);
        RAISE NOTICE 'Re-enabled trigger on aloa_applets: %', trigger_rec.tgname;
    END LOOP;

    -- 6. Re-enable all triggers on aloa_applet_interactions
    FOR trigger_rec IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'aloa_applet_interactions'::regclass
        AND tgname NOT LIKE 'RI_%'
    LOOP
        EXECUTE format('ALTER TABLE aloa_applet_interactions ENABLE TRIGGER %I', trigger_rec.tgname);
        RAISE NOTICE 'Re-enabled trigger on aloa_applet_interactions: %', trigger_rec.tgname;
    END LOOP;

    RAISE NOTICE '✅ TEST COMPLETE: If this succeeded, the issue is with a trigger';

EXCEPTION
    WHEN others THEN
        -- Make sure to re-enable triggers even on error
        FOR trigger_rec IN
            SELECT tgname
            FROM pg_trigger
            WHERE tgrelid IN ('aloa_applets'::regclass, 'aloa_applet_interactions'::regclass)
            AND tgname NOT LIKE 'RI_%'
        LOOP
            EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I',
                CASE WHEN trigger_rec.tgname IN (
                    SELECT tgname FROM pg_trigger WHERE tgrelid = 'aloa_applets'::regclass
                ) THEN 'aloa_applets' ELSE 'aloa_applet_interactions' END,
                trigger_rec.tgname);
        END LOOP;

        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'This means the issue is NOT trigger-related but something else';
END $$;