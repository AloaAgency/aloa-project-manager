-- Add client_review applet to the library (required for it to appear in the Add Applet modal)
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
    END IF;
END $$;