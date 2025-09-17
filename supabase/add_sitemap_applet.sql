-- Add sitemap applet type to the enum
ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'sitemap';

-- Insert sitemap applet type into applet_types table
INSERT INTO aloa_applet_types (type, name, description, icon, default_config)
VALUES (
  'sitemap',
  'Sitemap Builder',
  'Interactive sitemap builder for planning website structure',
  'sitemap',
  '{
    "locked": false,
    "max_pages": 10,
    "allow_custom_pages": true,
    "template": "standard",
    "instructions": "Build your website sitemap by organizing pages and their relationships"
  }'::jsonb
) ON CONFLICT (type) DO NOTHING;