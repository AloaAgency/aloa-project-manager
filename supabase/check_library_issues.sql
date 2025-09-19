-- Check what's wrong with specific applet types that aren't working

-- 1. Check the library entries for the problematic applets
SELECT
    name,
    type,
    is_active,
    category,
    CASE
        WHEN name IN ('Client Form', 'Form', 'Custom Form') THEN 'Form applet'
        WHEN name LIKE '%Upload%' THEN 'Upload applet'
        WHEN name LIKE '%Link%' THEN 'Link applet'
        WHEN name LIKE '%Sitemap%' THEN 'Sitemap applet'
        ELSE 'Other'
    END as applet_category
FROM aloa_applet_library
WHERE name IN ('Client Form', 'Form', 'Custom Form', 'Agency Upload', 'File Upload', 'Link Submission', 'Links', 'Sitemap', 'Sitemap Builder')
   OR type IN ('form', 'agency_upload', 'link_submission', 'sitemap', 'sitemap_builder')
ORDER BY name;

-- 2. Check if sitemap needs to be sitemap_builder
UPDATE aloa_applet_library
SET type = 'sitemap_builder'
WHERE type = 'sitemap' AND name LIKE '%Sitemap%';

-- 3. Make sure all these applets exist and are active
INSERT INTO aloa_applet_library (type, name, description, category, default_config, is_active, client_instructions)
VALUES
    ('form', 'Client Form', 'Collect structured information from clients', 'form',
     '{"required": true, "locked": false}'::jsonb, true,
     'Please fill out this form with the requested information'),

    ('agency_upload', 'Agency Upload', 'Upload files and assets for the project', 'media',
     '{"max_files": 10, "allowed_types": ["*"], "locked": false}'::jsonb, true,
     'Internal file upload for agency use'),

    ('link_submission', 'Link Submission', 'Submit reference links and inspiration', 'content',
     '{"max_links": 20, "locked": false}'::jsonb, true,
     'Add links to websites or resources for reference'),

    ('sitemap_builder', 'Sitemap Builder', 'Interactive sitemap builder', 'functionality',
     '{"locked": false, "allow_custom_pages": true}'::jsonb, true,
     'Build your site structure by organizing pages')
ON CONFLICT (type, name)
DO UPDATE SET
    is_active = true,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    default_config = EXCLUDED.default_config,
    client_instructions = EXCLUDED.client_instructions;

-- 4. Show final status of these applets
SELECT
    name,
    type,
    is_active,
    '✅ Should work now' as status
FROM aloa_applet_library
WHERE type IN ('form', 'agency_upload', 'link_submission', 'sitemap_builder')
ORDER BY name;