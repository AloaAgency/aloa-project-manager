-- Fix metadata column issue in extraction queue
-- The metadata column doesn't exist, we need to add it

-- 1. Add metadata column to extraction queue if it doesn't exist
ALTER TABLE aloa_knowledge_extraction_queue
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 2. First, check if there's a unique constraint
-- If not, add one (commented out - run manually if needed)
-- ALTER TABLE aloa_knowledge_extraction_queue
-- ADD CONSTRAINT unique_extraction_queue
-- UNIQUE (project_id, source_type, source_id);

-- 3. Queue the unextracted files for processing
-- Using a different approach without ON CONFLICT
WITH unextracted_files AS (
  SELECT
    pf.project_id,
    pf.id::text as source_id,
    pf.file_name,
    pf.file_type
  FROM aloa_project_files pf
  LEFT JOIN aloa_project_knowledge pk
    ON pk.source_id = pf.id::text
    AND pk.source_type = 'file_document'
  WHERE pf.project_id = '511306f6-0316-4a60-a318-1509d643238a'
    AND pk.id IS NULL  -- Only files that haven't been extracted
    AND (
      pf.file_type LIKE '%text%'
      OR pf.file_type LIKE '%markdown%'
      OR pf.file_name LIKE '%.md'
      OR pf.file_name LIKE '%.txt'
    )
)
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
  uf.project_id,
  'file_document',
  uf.source_id,
  jsonb_build_object(
    'file_name', uf.file_name,
    'file_type', uf.file_type,
    'file_id', uf.source_id
  ),
  'pending',
  5,
  NOW()
FROM unextracted_files uf
WHERE NOT EXISTS (
  -- Don't insert if already in queue
  SELECT 1
  FROM aloa_knowledge_extraction_queue eq
  WHERE eq.project_id = uf.project_id
    AND eq.source_type = 'file_document'
    AND eq.source_id = uf.source_id
);