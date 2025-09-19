-- Check CSV file extraction status

-- 1. Show all CSV files in the project
SELECT
  id,
  file_name,
  file_type,
  uploaded_at,
  url
FROM aloa_project_files
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND (file_name LIKE '%.csv' OR file_type LIKE '%csv%')
ORDER BY uploaded_at DESC;

-- 2. Check extraction queue for CSV files
SELECT
  source_id,
  metadata->>'file_name' as file_name,
  status,
  created_at,
  processed_at,
  error_message
FROM aloa_knowledge_extraction_queue
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND source_type = 'file_document'
  AND (metadata->>'file_name' LIKE '%.csv' OR metadata->>'file_type' LIKE '%csv%')
ORDER BY created_at DESC;

-- 3. Check if any CSV files have been extracted
SELECT
  pk.id,
  pk.source_id,
  pk.source_name,
  pk.content_summary,
  pk.created_at
FROM aloa_project_knowledge pk
WHERE pk.project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND pk.source_type = 'file_document'
  AND (pk.source_name LIKE '%.csv' OR pk.source_name LIKE '%CSV%')
ORDER BY pk.created_at DESC;

-- 4. Count all knowledge items for this project
SELECT
  source_type,
  COUNT(*) as count
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
GROUP BY source_type
ORDER BY count DESC;

-- 5. Most recent knowledge extraction
SELECT
  id,
  source_type,
  source_name,
  created_at
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY created_at DESC
LIMIT 5;