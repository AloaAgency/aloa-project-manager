-- Verification Script for Automatic Knowledge Extraction System
-- Run this after installing the automatic extraction triggers

-- ============================================
-- 1. Check if triggers are installed
-- ============================================

SELECT
    n.nspname as schemaname,
    c.relname as tablename,
    t.tgname as trigger_name,
    t.tgtype,
    t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND t.tgname LIKE '%knowledge%'
ORDER BY c.relname, t.tgname;

-- ============================================
-- 2. Check knowledge extraction by source type
-- ============================================

SELECT
    source_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT project_id) as projects_with_data,
    MAX(processed_at) as last_extraction,
    MIN(processed_at) as first_extraction
FROM aloa_project_knowledge
GROUP BY source_type
ORDER BY source_type;

-- ============================================
-- 3. Check knowledge by category
-- ============================================

SELECT
    category,
    source_type,
    COUNT(*) as count,
    AVG(importance_score) as avg_importance
FROM aloa_project_knowledge
WHERE is_current = true
GROUP BY category, source_type
ORDER BY category, source_type;

-- ============================================
-- 4. Check specific project knowledge
-- ============================================

-- Replace with your project ID
WITH project_check AS (
    SELECT '511306f6-0316-4a60-a318-1509d643238a'::uuid as check_project_id
)
SELECT
    k.source_type,
    k.category,
    k.content_summary,
    k.tags,
    k.importance_score,
    k.processed_at,
    k.extracted_by
FROM aloa_project_knowledge k, project_check
WHERE k.project_id = project_check.check_project_id
AND k.is_current = true
ORDER BY k.processed_at DESC;

-- ============================================
-- 5. Check for missing extractions
-- ============================================

-- Projects without metadata extraction
SELECT
    p.id,
    COALESCE(p.name, p.project_name) as project_name,
    p.client_name,
    p.created_at
FROM aloa_projects p
LEFT JOIN aloa_project_knowledge k ON
    p.id = k.project_id
    AND k.source_type = 'project_metadata'
    AND k.is_current = true
WHERE k.id IS NULL;

-- Applet interactions without extraction
SELECT
    ai.id,
    ai.project_id,
    a.name as applet_name,
    a.type as applet_type,
    ai.created_at
FROM aloa_applet_interactions ai
JOIN aloa_applets a ON ai.applet_id = a.id
LEFT JOIN aloa_project_knowledge k ON
    ai.project_id = k.project_id
    AND k.source_type = 'applet_interaction'
    AND k.source_id = ai.id::text
    AND k.is_current = true
WHERE k.id IS NULL
AND ai.data IS NOT NULL
LIMIT 10;

-- ============================================
-- 6. Test trigger functionality
-- ============================================

-- This will test if triggers work by updating a project
-- (triggers a knowledge extraction)
DO $$
DECLARE
    test_project_id uuid;
BEGIN
    -- Get a project to test with
    SELECT id INTO test_project_id
    FROM aloa_projects
    LIMIT 1;

    IF test_project_id IS NOT NULL THEN
        -- Update the project (should trigger extraction)
        UPDATE aloa_projects
        SET updated_at = NOW()
        WHERE id = test_project_id;

        RAISE NOTICE 'Updated project % to trigger extraction', test_project_id;
    END IF;
END $$;

-- ============================================
-- 7. Summary statistics
-- ============================================

SELECT
    'Total Knowledge Items' as metric,
    COUNT(*)::text as value
FROM aloa_project_knowledge
WHERE is_current = true

UNION ALL

SELECT
    'Projects with Knowledge' as metric,
    COUNT(DISTINCT project_id)::text as value
FROM aloa_project_knowledge
WHERE is_current = true

UNION ALL

SELECT
    'Average Items per Project' as metric,
    ROUND(AVG(item_count), 2)::text as value
FROM (
    SELECT project_id, COUNT(*) as item_count
    FROM aloa_project_knowledge
    WHERE is_current = true
    GROUP BY project_id
) project_counts

UNION ALL

SELECT
    'Extraction Methods Used' as metric,
    STRING_AGG(DISTINCT extracted_by, ', ') as value
FROM aloa_project_knowledge

UNION ALL

SELECT
    'Last Extraction Time' as metric,
    MAX(processed_at)::text as value
FROM aloa_project_knowledge;