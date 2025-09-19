-- Check the status of knowledge extraction after queueing files

-- 1. Show current extraction queue status
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
ORDER BY created_at DESC;

-- 2. Check which files now have knowledge extracted
SELECT
  pf.file_name,
  pf.id as file_id,
  pk.id as knowledge_id,
  pk.created_at as extracted_at,
  CASE
    WHEN pk.id IS NULL THEN '❌ NOT EXTRACTED'
    ELSE '✅ EXTRACTED'
  END as status,
  pk.content_summary
FROM aloa_project_files pf
LEFT JOIN aloa_project_knowledge pk
  ON pk.source_id = pf.id::text
  AND pk.source_type = 'file_document'
WHERE pf.project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND (
    pf.file_type LIKE '%text%'
    OR pf.file_type LIKE '%markdown%'
    OR pf.file_name LIKE '%.md'
    OR pf.file_name LIKE '%.txt'
  )
ORDER BY pf.uploaded_at DESC;

-- 3. Count total knowledge items for the project
SELECT
  source_type,
  COUNT(*) as count
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
GROUP BY source_type

UNION ALL

SELECT
  'TOTAL' as source_type,
  COUNT(*) as count
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY source_type;