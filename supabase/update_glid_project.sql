-- Manually queue CSV file for knowledge extraction
-- Run this to extract knowledge from the responses.csv file

-- 1. First, check if the CSV file exists
SELECT
  id,
  file_name,
  file_type,
  uploaded_at
FROM aloa_project_files
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND file_name LIKE '%responses%'
ORDER BY uploaded_at DESC;

-- 2. Queue the CSV file for extraction
INSERT INTO aloa_knowledge_extraction_queue (
  project_id,
  source_type,
  source_id,
  metadata,
  status,
  priority,
  created_at
)
SELECT
  project_id,
  'file_document',
  id::text,
  jsonb_build_object(
    'file_name', file_name,
    'file_type', file_type,
    'file_id', id
  ),
  'pending',
  5,
  NOW()
FROM aloa_project_files
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND file_name LIKE '%responses%'
  AND file_name LIKE '%.csv'
  AND NOT EXISTS (
    -- Don't add if already in queue
    SELECT 1
    FROM aloa_knowledge_extraction_queue eq
    WHERE eq.project_id = '511306f6-0316-4a60-a318-1509d643238a'
      AND eq.source_type = 'file_document'
      AND eq.source_id = aloa_project_files.id::text
  )
  AND NOT EXISTS (
    -- Don't add if already extracted
    SELECT 1
    FROM aloa_project_knowledge pk
    WHERE pk.project_id = '511306f6-0316-4a60-a318-1509d643238a'
      AND pk.source_type = 'file_document'
      AND pk.source_id = aloa_project_files.id::text
  );

-- 3. Check the queue status
SELECT
  source_id,
  metadata->>'file_name' as file_name,
  status,
  created_at
FROM aloa_knowledge_extraction_queue
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND metadata->>'file_name' LIKE '%responses%'
ORDER BY created_at DESC;