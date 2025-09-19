-- Debug knowledge extraction issues
-- Run each section separately to diagnose the problem

-- 1. First, check the actual structure of the extraction queue table
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'aloa_knowledge_extraction_queue'
ORDER BY ordinal_position;

-- 2. Check if there are ANY knowledge items at all
SELECT COUNT(*) as total_knowledge_items
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a';

-- 3. Check knowledge items specifically from files
SELECT
  COUNT(*) as file_knowledge_count
FROM aloa_project_knowledge
WHERE source_type = 'file_document'
  AND project_id = '511306f6-0316-4a60-a318-1509d643238a';

-- 4. Show ALL knowledge items for this project (to see what's actually there)
SELECT
  id,
  source_type,
  source_name,
  content_summary,
  category,
  created_at
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check extraction queue entries (without metadata column)
SELECT
  id,
  source_type,
  source_id,
  status,
  created_at,
  processed_at,
  error_message
FROM aloa_knowledge_extraction_queue
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check all text files in the project
SELECT
  id,
  file_name,
  file_type,
  uploaded_at
FROM aloa_project_files
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND (
    file_type LIKE '%text%'
    OR file_type LIKE '%markdown%'
    OR file_name LIKE '%.md'
    OR file_name LIKE '%.txt'
    OR file_name LIKE '%.json'
  )
ORDER BY uploaded_at DESC;

-- 7. Join files with knowledge to see what's been extracted
SELECT
  pf.file_name,
  pf.id as file_id,
  pk.id as knowledge_id,
  pk.created_at as extracted_at,
  CASE
    WHEN pk.id IS NULL THEN 'NOT EXTRACTED'
    ELSE 'EXTRACTED'
  END as status
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