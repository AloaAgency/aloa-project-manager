-- Complete setup for client_review applet type
-- Run this script in Supabase SQL editor to ensure everything is properly configured

-- 1. First check if client_review exists in the enum
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'applet_type'::regtype
AND enumlabel = 'client_review';

-- 2. Add client_review to the enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'client_review'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        -- Get the proper enum type OID
        EXECUTE 'ALTER TYPE applet_type ADD VALUE ''client_review''';
        RAISE NOTICE 'Added client_review to applet_type enum';
    ELSE
        RAISE NOTICE 'client_review already exists in applet_type enum';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'client_review already exists in applet_type enum (caught exception)';
    WHEN others THEN
        RAISE NOTICE 'Error adding client_review to enum: %', SQLERRM;
END $$;

-- 3. Verify it was added
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'applet_type'::regtype
ORDER BY enumlabel;

-- 4. Check if library entry exists
SELECT * FROM aloa_applet_library
WHERE type = 'client_review'
AND name = 'Client Review';

-- 5. Insert or update the library entry
INSERT INTO aloa_applet_library (
    type,
    name,
    description,
    default_config,
    is_active,
    category,
    client_instructions,
    requires_approval,
    created_at,
    updated_at
) VALUES (
    'client_review',
    'Client Review',
    'Request client approval for completed work with revision tracking',
    '{"header": "Review & Approve", "description": "Please review the work above and let us know if it meets your requirements.", "locked": false, "max_revisions": 2}'::jsonb,
    true,
    'collaboration',
    'Review the work presented and either approve it or request specific revisions. Note: Your contract includes up to 2 revision requests per step.',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (type, name)
DO UPDATE SET
    description = EXCLUDED.description,
    default_config = EXCLUDED.default_config,
    is_active = EXCLUDED.is_active,
    category = EXCLUDED.category,
    client_instructions = EXCLUDED.client_instructions,
    requires_approval = EXCLUDED.requires_approval,
    updated_at = NOW();

-- 6. Final verification - show all active library items
SELECT type, name, category, is_active
FROM aloa_applet_library
WHERE is_active = true
ORDER BY category, name;

-- 7. Test that we can insert a client_review applet (will rollback)
DO $$
DECLARE
    test_projectlet_id UUID;
    test_applet_id UUID;
BEGIN
    -- Get a real projectlet ID for testing (or skip if none exists)
    SELECT id INTO test_projectlet_id
    FROM aloa_projectlets
    LIMIT 1;

    IF test_projectlet_id IS NOT NULL THEN
        -- Try to insert a test applet
        INSERT INTO aloa_applets (
            projectlet_id,
            name,
            type,
            order_index,
            config
        ) VALUES (
            test_projectlet_id,
            'Test Client Review',
            'client_review',
            999,
            '{"test": true}'::jsonb
        ) RETURNING id INTO test_applet_id;

        -- If we got here, it worked!
        RAISE NOTICE 'Successfully created test client_review applet with ID: %', test_applet_id;

        -- Clean up the test
        DELETE FROM aloa_applets WHERE id = test_applet_id;
        RAISE NOTICE 'Test applet cleaned up';
    ELSE
        RAISE NOTICE 'No projectlets found for testing';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating test applet: %', SQLERRM;
END $$;