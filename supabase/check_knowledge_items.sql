-- Check knowledge items for the glīd project
-- Project ID: 511306f6-0316-4a60-a318-1509d643238a

-- 1. Count all knowledge items for this project
SELECT
  COUNT(*) as total_items,
  COUNT(CASE WHEN is_current = true THEN 1 END) as current_items,
  COUNT(CASE WHEN is_current = false THEN 1 END) as archived_items
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a';

-- 2. Show all knowledge items with details
SELECT
  id,
  source_type,
  source_name,
  category,
  importance_score,
  is_current,
  created_at,
  extracted_by,
  LEFT(content, 100) as content_preview
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY created_at DESC;

-- 3. Check if there are any knowledge items at all in the table
SELECT
  COUNT(*) as total_knowledge_items_in_db,
  COUNT(DISTINCT project_id) as projects_with_knowledge
FROM aloa_project_knowledge;

-- 4. List distinct project IDs that have knowledge
SELECT DISTINCT
  project_id,
  COUNT(*) as item_count
FROM aloa_project_knowledge
GROUP BY project_id
ORDER BY item_count DESC;