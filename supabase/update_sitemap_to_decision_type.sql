-- Update sitemap and sitemap_builder applets to be decision type (Client Admin only)
-- This prevents multiple sitemap inputs from different client participants

-- Update applet library entries
UPDATE aloa_applet_library
SET access_type = 'decision'::applet_access_type
WHERE type IN ('sitemap', 'sitemap_builder');

-- Update existing applet instances
UPDATE aloa_applets
SET access_type = 'decision'::applet_access_type
WHERE type IN ('sitemap', 'sitemap_builder');