-- Add font_picker applet to the library
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'font_picker'
        AND name = 'Font Preferences'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, access_type, created_at, updated_at
        ) VALUES (
            'font_picker',
            'Font Preferences',
            'Help clients explore and indicate their font style preferences. They select 3 favorite font samples to help guide design direction.',
            '{"description": "Pick 3 font styles that resonate with you. This helps us understand your typography preferences and design aesthetic.", "locked": false}'::jsonb,
            true,
            'content',
            'Browse through font samples and select 3 that you like. This is just to help us understand your preferences - not picking final fonts yet!',
            false,
            'input'::applet_access_type,
            NOW(), NOW()
        );
    END IF;
END $$;
