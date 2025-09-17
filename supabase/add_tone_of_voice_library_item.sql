-- Add Tone of Voice to the applet library
-- First check if it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'tone_of_voice'
        AND name = 'Tone of Voice Selection'
    ) THEN
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
            'tone_of_voice',
            'Tone of Voice Selection',
            'Help clients identify and select their brand''s tone of voice',
            '{
                "description": "Select the tone of voice that best represents your brand",
                "locked": false
            }'::jsonb,
            true,
            'content',
            'Please review the different tone of voice options and select the one that best represents your brand personality. Consider how you want your brand to communicate with your audience.',
            false,
            NOW(),
            NOW()
        );
    END IF;
END $$;