-- First check if applet_type enum exists and add sitemap value
DO $$
BEGIN
    -- Check if the type exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'applet_type' AND e.enumlabel = 'sitemap'
    ) THEN
        ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'sitemap';
    END IF;
END
$$;

-- The sitemap applet doesn't need an entry in a types table since the system
-- appears to handle applet types through the enum and config in the applets themselves.
-- The applet will be configured when added to a projectlet through the admin UI.