-- First add palette_cleanser to the applet_type enum if it doesn't exist
DO $$
BEGIN
  -- Check if palette_cleanser already exists in the enum
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'palette_cleanser'
    AND enumtypid = 'applet_type'::regtype
  ) THEN
    -- Add the new value to the enum
    ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'palette_cleanser';
  END IF;
END $$;

-- Add Palette Cleanser applet to the library
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
ON CONFLICT (type) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config_schema = EXCLUDED.config_schema,
  default_config = EXCLUDED.default_config,
  tags = EXCLUDED.tags,
  updated_at = CURRENT_TIMESTAMP;