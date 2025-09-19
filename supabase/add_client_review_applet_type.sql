-- Add client_review applet type to enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'client_review'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        ALTER TYPE applet_type ADD VALUE 'client_review';
    END IF;
END $$;