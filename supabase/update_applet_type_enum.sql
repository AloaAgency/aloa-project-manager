-- First, check current enum values
SELECT unnest(enum_range(NULL::applet_type)) AS existing_types;

-- Add link_submission to the applet_type enum if it doesn't exist
DO $$
BEGIN
  -- Check if link_submission already exists in the enum
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'link_submission' 
    AND enumtypid = 'applet_type'::regtype
  ) THEN
    -- Add the new value to the enum
    ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'link_submission';
  END IF;
END $$;

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::applet_type)) AS updated_types;