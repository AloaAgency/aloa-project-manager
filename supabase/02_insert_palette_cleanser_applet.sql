-- Insert Palette Cleanser applet to the library
-- Run this AFTER running 01_add_palette_cleanser_enum.sql

INSERT INTO aloa_applet_library (
  name,
  description,
  type,
  icon,
  config_schema,
  default_config,
  is_client_facing,
  requires_approval,
  allows_revision,
  auto_completes,
  tags,
  created_by,
  is_active
) VALUES (
  'Palette Cleanser',
  'Interactive color palette explorer that helps clients identify their color preferences and brand requirements',
  'palette_cleanser',
  'palette',
  '{
    "title": {
      "type": "string",
      "label": "Title",
      "default": "Color Palette Preferences"
    },
    "description": {
      "type": "text",
      "label": "Description",
      "default": "Help us understand your color preferences by exploring different palettes and identifying your brand colors."
    },
    "allow_custom_palette": {
      "type": "boolean",
      "label": "Allow Custom Palette Creation",
      "default": true
    },
    "require_brand_colors": {
      "type": "boolean",
      "label": "Require Brand Colors",
      "default": false
    },
    "min_liked_palettes": {
      "type": "number",
      "label": "Minimum Liked Palettes",
      "default": 3
    }
  }'::jsonb,
  '{
    "title": "Color Palette Preferences",
    "description": "Help us understand your color preferences by exploring different palettes and identifying your brand colors.",
    "allow_custom_palette": true,
    "require_brand_colors": false,
    "min_liked_palettes": 3
  }'::jsonb,
  true,
  false,
  false,
  false,
  ARRAY['design', 'branding', 'color', 'interactive'],
  'admin',
  true
)
ON CONFLICT DO NOTHING;