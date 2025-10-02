-- Comprehensive verification and fix for client_review access type
-- This ensures client_review has the same decision-type access as phase_review

-- 1. First, let's check the current state of both applets
SELECT
    type,
    name,
    access_type,
    category,
    requires_approval
FROM aloa_applet_library
WHERE type IN ('client_review', 'phase_review')
ORDER BY type;

-- 2. Check if access_type column exists and has the right enum type
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'aloa_applet_library'
AND column_name = 'access_type';

-- 3. Verify the enum values available
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'applet_access_type'::regtype
ORDER BY enumsortorder;

-- 4. Now UPDATE the client_review to match phase_review's access type
UPDATE aloa_applet_library
SET
    access_type = 'decision'::applet_access_type,
    updated_at = NOW()
WHERE type = 'client_review';

-- 5. Also update any existing client_review applet instances
UPDATE aloa_applets
SET access_type = 'decision'::applet_access_type
WHERE type = 'client_review';

-- 6. Verify the updates were successful
SELECT
    'Library Item' as source,
    type,
    name,
    access_type,
    category
FROM aloa_applet_library
WHERE type IN ('client_review', 'phase_review')

UNION ALL

SELECT
    'Applet Instance' as source,
    a.type,
    a.name,
    a.access_type,
    NULL as category
FROM aloa_applets a
WHERE a.type IN ('client_review', 'phase_review')
ORDER BY source, type;

-- 7. Check if there are any client_review applets without the correct access_type
SELECT
    a.id,
    a.name,
    a.type,
    a.access_type,
    p.name as project_name
FROM aloa_applets a
JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
JOIN aloa_projects p ON pl.project_id = p.id
WHERE a.type = 'client_review'
AND (a.access_type IS NULL OR a.access_type != 'decision');

-- 8. Final confirmation - both should show 'decision' as access_type
SELECT
    type,
    COUNT(*) as count,
    access_type
FROM aloa_applet_library
WHERE type IN ('client_review', 'phase_review')
GROUP BY type, access_type;