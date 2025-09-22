-- Add ai_form_results applet type to enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'ai_form_results'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        ALTER TYPE applet_type ADD VALUE 'ai_form_results';
    END IF;
END $$;