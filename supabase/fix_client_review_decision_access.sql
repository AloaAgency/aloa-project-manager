-- Fix Client Review to be a decision-type applet (matching phase_review)
-- This will hide it from client_participant users

-- 1. Check current state - what access_type do these applets have?
SELECT
    'Current Library State:' as info;

SELECT
    type,
    name,
    access_type,
    CASE
        WHEN access_type = 'decision' THEN '✓ Hidden from participants'
        WHEN access_type = 'input' THEN '✗ Visible to all'
        WHEN access_type IS NULL THEN '✗ NULL - defaults to input'
        ELSE '? Unknown'
    END as visibility_status
FROM aloa_applet_library
WHERE type IN ('client_review', 'phase_review')
ORDER BY type;

-- 2. Update client_review in the library to be a decision type
UPDATE aloa_applet_library
SET
    access_type = 'decision'::applet_access_type,
    updated_at = NOW()
WHERE type = 'client_review';

-- 3. Update all existing client_review applet instances
UPDATE aloa_applets
SET access_type = 'decision'::applet_access_type
WHERE type = 'client_review';

-- 4. Verify the fix - both should now be 'decision' type
SELECT
    'After Fix - Library:' as info;

SELECT
    type,
    name,
    access_type,
    CASE
        WHEN access_type = 'decision' THEN '✓ Hidden from participants'
        WHEN access_type = 'input' THEN '✗ Visible to all'
        WHEN access_type IS NULL THEN '✗ NULL - defaults to input'
        ELSE '? Unknown'
    END as visibility_status
FROM aloa_applet_library
WHERE type IN ('client_review', 'phase_review')
ORDER BY type;

-- 5. Check all client_review instances in projects
SELECT
    'Client Review Instances in Projects:' as info;

SELECT
    a.id,
    a.name,
    a.type,
    a.access_type,
    p.name as project_name,
    CASE
        WHEN a.access_type = 'decision' THEN '✓ Hidden from participants'
        WHEN a.access_type = 'input' THEN '✗ Visible to all'
        WHEN a.access_type IS NULL THEN '✗ NULL - defaults to input'
        ELSE '? Unknown'
    END as visibility_status
FROM aloa_applets a
JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
JOIN aloa_projects p ON pl.project_id = p.id
WHERE a.type = 'client_review'
ORDER BY p.name, a.name;

-- 6. Final count check
SELECT
    'Summary:' as info;

SELECT
    type,
    COUNT(*) as total_instances,
    COUNT(CASE WHEN access_type = 'decision' THEN 1 END) as decision_type_count,
    COUNT(CASE WHEN access_type != 'decision' OR access_type IS NULL THEN 1 END) as incorrect_count
FROM aloa_applets
WHERE type IN ('client_review', 'phase_review')
GROUP BY type
ORDER BY type;