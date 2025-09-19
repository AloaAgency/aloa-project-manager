-- Safely check valid applet types without referencing invalid ones

-- 1. Show all valid applet types in the enum
SELECT
    enumlabel as valid_type,
    enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'applet_type'::regtype
ORDER BY enumsortorder;

-- 2. Check what's currently in the library (as text, not enum comparison)
SELECT
    name,
    type::text as type_text,
    is_active
FROM aloa_applet_library
ORDER BY name;

-- 3. Show which library entries have problems
SELECT
    name,
    type::text as current_type,
    CASE
        WHEN type::text IN (
            SELECT enumlabel::text
            FROM pg_enum
            WHERE enumtypid = 'applet_type'::regtype
        ) THEN 'Valid'
        ELSE 'INVALID - needs fixing'
    END as status
FROM aloa_applet_library
WHERE name IN ('Agency Upload', 'File Upload', 'Client Form', 'Link Submission', 'Links', 'Sitemap Builder', 'Sitemap');