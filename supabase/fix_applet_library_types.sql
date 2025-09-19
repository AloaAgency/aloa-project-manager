-- Fix applet library entries with invalid types

-- 1. Check what's currently in the library with wrong types
SELECT
    name,
    type,
    CASE
        WHEN type IN ('form', 'agency_upload', 'link_submission', 'sitemap_builder', 'client_review', 'tone_of_voice', 'palette_cleanser', 'text', 'divider', 'image')
        THEN '✅ Valid'
        ELSE '❌ Invalid type: ' || type
    END as type_status
FROM aloa_applet_library
ORDER BY type;

-- 2. Fix entries with wrong types
UPDATE aloa_applet_library
SET type = 'text'
WHERE type = 'config';

UPDATE aloa_applet_library
SET type = 'text'
WHERE type = 'configuration';

-- 3. Show all valid applet types
SELECT enumlabel as valid_applet_types
FROM pg_enum
WHERE enumtypid = 'applet_type'::regtype
ORDER BY enumlabel;

-- 4. Check if there's a unique constraint issue on aloa_project_knowledge
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'aloa_project_knowledge'::regclass
AND contype = 'u';

-- 5. Fix the ON CONFLICT issue by removing the constraint from our trigger functions
-- First, check what the actual unique constraint is
SELECT
    'aloa_project_knowledge unique constraints:' as info,
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'aloa_project_knowledge'::regclass
AND contype IN ('u', 'p');

-- 6. Also check if there are still references to the wrong column
SELECT
    proname as function_name,
    'Still uses "importance" instead of "importance_score"' as issue
FROM pg_proc
WHERE prosrc LIKE '%aloa_project_knowledge%'
AND prosrc LIKE '%importance[,)]%'
AND prosrc NOT LIKE '%importance_score%';