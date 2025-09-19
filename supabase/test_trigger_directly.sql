-- Test to see what exactly is causing the client_review applet creation to fail

-- 1. Check current triggers on aloa_applet_interactions
SELECT
    tgname AS trigger_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid = 'aloa_applet_interactions'::regclass;

-- 2. Directly test creating a client_review applet without any interactions
DO $$
DECLARE
    test_projectlet_id UUID := 'aa6fde15-f4b3-42c5-a654-4790fd2bc045';
    new_applet_id UUID;
BEGIN
    -- Try a simple insert
    INSERT INTO aloa_applets (
        projectlet_id,
        name,
        type,
        order_index,
        config
    ) VALUES (
        test_projectlet_id,
        'Direct Test Client Review',
        'client_review',
        998,
        '{"header": "Test", "locked": false}'::jsonb
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE 'SUCCESS! Created applet with ID: %', new_applet_id;

    -- Show the created applet
    PERFORM * FROM aloa_applets WHERE id = new_applet_id;

    -- Clean up
    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Cleaned up test applet';

EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'ERROR creating applet: %', SQLERRM;
        RAISE NOTICE 'ERROR details: %', SQLSTATE;
END $$;

-- 3. Check if there are any RLS policies that might be blocking
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'aloa_applets'
ORDER BY policyname;