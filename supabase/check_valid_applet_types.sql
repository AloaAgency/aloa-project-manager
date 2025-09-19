-- Check what applet types actually exist in the enum

-- 1. Show all valid applet types in the enum
SELECT
    enumlabel as valid_type,
    enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'applet_type'::regtype
ORDER BY enumsortorder;

-- 2. Check what's in the library
SELECT DISTINCT
    type,
    COUNT(*) as count
FROM aloa_applet_library
GROUP BY type
ORDER BY type;

-- 3. Fix invalid types in the library
-- Map agency_upload to file_upload if that exists, or just upload
UPDATE aloa_applet_library
SET type = 'file_upload'
WHERE type = 'agency_upload';

-- If file_upload doesn't exist, try 'upload'
UPDATE aloa_applet_library
SET type = 'upload'
WHERE type = 'file_upload'
AND NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'applet_type'::regtype
    AND enumlabel = 'file_upload'
);

-- If neither exist, use 'text' as a fallback
UPDATE aloa_applet_library
SET type = 'text'
WHERE type NOT IN (
    SELECT enumlabel
    FROM pg_enum
    WHERE enumtypid = 'applet_type'::regtype
);

-- 4. Show final state
SELECT
    name,
    type,
    is_active
FROM aloa_applet_library
WHERE name LIKE '%Upload%'
   OR name LIKE '%Form%'
   OR name LIKE '%Link%'
   OR name LIKE '%Sitemap%'
ORDER BY name;