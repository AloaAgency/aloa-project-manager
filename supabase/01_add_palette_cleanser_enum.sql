-- Add palette_cleanser to the applet_type enum
-- Run this FIRST and commit before running the next file

-- Add the new value to the enum (IF NOT EXISTS prevents errors if already added)
ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'palette_cleanser';

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::applet_type)) AS updated_types;