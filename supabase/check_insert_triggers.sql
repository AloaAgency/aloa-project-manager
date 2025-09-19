-- Check specifically for INSERT triggers that might fire when creating a client_review applet

-- 1. Show ALL triggers on aloa_applets (including system triggers)
SELECT
    tgname AS trigger_name,
    CASE
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END AS timing,
    CASE
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        WHEN tgtype & 32 = 32 THEN 'TRUNCATE'
        ELSE 'MULTIPLE'
    END AS event,
    tgenabled AS enabled,
    p.proname AS function_name
FROM pg_trigger t
LEFT JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'aloa_applets'::regclass
ORDER BY tgname;

-- 2. Show the actual error by trying to insert directly
DO $$
DECLARE
    test_projectlet_id UUID := 'aa6fde15-f4b3-42c5-a654-4790fd2bc045';
    new_applet_id UUID;
BEGIN
    -- Direct insert attempt
    INSERT INTO aloa_applets (
        projectlet_id,
        name,
        type,
        order_index,
        config,
        form_id
    ) VALUES (
        test_projectlet_id,
        'Direct Insert Test',
        'client_review',
        999,
        '{"header": "Test", "locked": false}'::jsonb,
        NULL
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE 'SUCCESS: Created applet %', new_applet_id;

    -- Clean up
    DELETE FROM aloa_applets WHERE id = new_applet_id;

EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'ERROR CODE: %', SQLSTATE;
        RAISE NOTICE 'ERROR MSG: %', SQLERRM;
        RAISE NOTICE 'ERROR DETAIL: %', SQLERRM;
END $$;