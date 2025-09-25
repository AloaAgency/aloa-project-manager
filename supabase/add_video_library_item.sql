-- Add video applet to the library (required for it to appear in the Add Applet modal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'video'
        AND name = 'Video Presentation'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, created_at, updated_at
        ) VALUES (
            'video',
            'Video Presentation',
            'Present videos to clients with engagement tracking. Perfect for onboarding videos, tutorials, or project showcases.',
            '{"title": "Welcome Video", "description": "Watch this brief introduction to understand our process", "video_url": "", "locked": false}'::jsonb,
            true,
            'media',
            'Watch the video to understand key concepts and project information. Progress is tracked automatically.',
            false,
            NOW(), NOW()
        );
    END IF;
END $$;