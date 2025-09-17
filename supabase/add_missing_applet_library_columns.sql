-- Add missing columns to aloa_applet_library table if they don't exist
ALTER TABLE aloa_applet_library
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE aloa_applet_library
ADD COLUMN IF NOT EXISTS client_instructions TEXT;

ALTER TABLE aloa_applet_library
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Now insert the sitemap applet
INSERT INTO aloa_applet_library (
  name,
  description,
  type,
  icon,
  default_config,
  tags,
  category,
  is_active,
  requires_approval,
  client_instructions,
  internal_notes
) VALUES (
  'Sitemap Builder',
  'Interactive sitemap builder for planning website structure',
  'sitemap',
  'Map',
  jsonb_build_object(
    'locked', false,
    'instructions', 'Build your website sitemap by organizing pages and their relationships. Drag and drop pages to create your ideal site structure.',
    'allow_custom_pages', true,
    'template', 'standard'
  ),
  ARRAY['planning', 'structure', 'navigation'],
  'Planning',
  true,
  false,
  'Create your website''s sitemap by organizing pages according to your project scope. You can drag and drop pages to arrange them hierarchically.',
  'Client uses this to define their site structure based on the contracted number of pages.'
) ON CONFLICT DO NOTHING;