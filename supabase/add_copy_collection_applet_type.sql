-- Add copy_collection applet type to enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'copy_collection'
        AND enumtypid = 'applet_type'::regtype
    ) THEN
        ALTER TYPE applet_type ADD VALUE 'copy_collection';
    END IF;
END $$;