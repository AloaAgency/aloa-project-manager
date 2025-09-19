-- Check if client_review exists in applet_type enum
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'applet_type'::regtype AND enumlabel = 'client_review';

-- If it doesn't exist, add it (this will fail silently if it already exists)
DO $$
BEGIN
    -- Check if the value exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'client_review'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        ALTER TYPE applet_type ADD VALUE 'client_review';
        RAISE NOTICE 'Added client_review to applet_type enum';
    ELSE
        RAISE NOTICE 'client_review already exists in applet_type enum';
    END IF;
END $$;

-- Verify it's in the library
SELECT * FROM aloa_applet_library WHERE type = 'client_review';

-- If not in library, ensure it's added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'client_review'
        AND name = 'Client Review'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, created_at, updated_at
        ) VALUES (
            'client_review',
            'Client Review',
            'Request client approval for completed work with revision tracking',
            '{"header": "Review & Approve", "description": "Please review the work above and let us know if it meets your requirements.", "locked": false, "max_revisions": 2}'::jsonb,
            true,
            'collaboration',
            'Review the work presented and either approve it or request specific revisions. Note: Your contract includes up to 2 revision requests per step.',
            true,
            NOW(), NOW()
        );
        RAISE NOTICE 'Added Client Review to applet library';
    ELSE
        RAISE NOTICE 'Client Review already exists in applet library';
    END IF;
END $$;

-- Show all applet types for debugging
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'applet_type'::regtype ORDER BY enumlabel;