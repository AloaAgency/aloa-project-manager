-- Add phase_review applet type to enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'phase_review'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        ALTER TYPE applet_type ADD VALUE 'phase_review';
    END IF;
END $$;