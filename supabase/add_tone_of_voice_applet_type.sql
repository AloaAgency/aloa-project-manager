-- Add Tone of Voice applet type to the enum if it doesn't exist
DO $$
BEGIN
    -- Check if 'tone_of_voice' already exists in the enum
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'tone_of_voice'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        -- Add the new value to the enum
        ALTER TYPE applet_type ADD VALUE 'tone_of_voice';
    END IF;
END $$;

-- Optional: Add a sample Tone of Voice applet for testing (commented out by default)
-- Uncomment and modify the project_id and projectlet_id to match your test data
/*
INSERT INTO aloa_applets (
    projectlet_id,
    type,
    name,
    config,
    created_at,
    updated_at
) VALUES (
    '7416c164-99e2-4a76-a81d-13d834f9e3db', -- Replace with your actual projectlet_id
    'tone_of_voice',
    'Brand Tone Selection',
    '{
        "description": "Select the tone of voice that best represents your brand",
        "locked": false
    }'::jsonb,
    NOW(),
    NOW()
);
*/