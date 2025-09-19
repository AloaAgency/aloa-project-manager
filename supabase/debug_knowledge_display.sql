-- Debug why knowledge items aren't showing up
-- Project ID: 511306f6-0316-4a60-a318-1509d643238a

-- 1. Check the is_current status of knowledge items
SELECT
  source_type,
  source_name,
  is_current,
  created_at,
  importance_score
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY created_at DESC;

-- 2. Count by is_current status
SELECT
  is_current,
  COUNT(*) as count
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
GROUP BY is_current;

-- 3. If items are not current, make them current
UPDATE aloa_project_knowledge
SET is_current = true
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
AND is_current = false;

-- 4. Verify the update
SELECT
  COUNT(*) as total_current_items
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
AND is_current = true;