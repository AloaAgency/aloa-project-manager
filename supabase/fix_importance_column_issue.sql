-- Fix the importance column issue in the database
-- This script ensures all tables use importance_score instead of importance

-- 1. First check if aloa_project_knowledge has the correct column
DO $$
BEGIN
  -- Check if importance column exists (the wrong one)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_project_knowledge'
    AND column_name = 'importance'
  ) THEN
    -- Rename it to importance_score
    ALTER TABLE aloa_project_knowledge
    RENAME COLUMN importance TO importance_score;
  END IF;

  -- Ensure importance_score exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_project_knowledge'
    AND column_name = 'importance_score'
  ) THEN
    ALTER TABLE aloa_project_knowledge
    ADD COLUMN importance_score INTEGER DEFAULT 5;
  END IF;
END $$;

-- 2. Fix aloa_client_stakeholders table
DO $$
BEGIN
  -- Check if importance column exists (the wrong one)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_client_stakeholders'
    AND column_name = 'importance'
  ) THEN
    -- Rename it to importance_score
    ALTER TABLE aloa_client_stakeholders
    RENAME COLUMN importance TO importance_score;
  END IF;

  -- Ensure importance_score exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_client_stakeholders'
    AND column_name = 'importance_score'
  ) THEN
    ALTER TABLE aloa_client_stakeholders
    ADD COLUMN importance_score INTEGER DEFAULT 5;
  END IF;
END $$;

-- 3. Fix aloa_knowledge_extraction_queue if needed
DO $$
BEGIN
  -- Check if importance column exists in extraction queue
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_knowledge_extraction_queue'
    AND column_name = 'importance'
  ) THEN
    -- Rename it to importance_score
    ALTER TABLE aloa_knowledge_extraction_queue
    RENAME COLUMN importance TO importance_score;
  END IF;
END $$;

-- 4. Verify the columns are correct
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('aloa_project_knowledge', 'aloa_client_stakeholders', 'aloa_knowledge_extraction_queue')
  AND column_name LIKE '%importance%'
ORDER BY table_name, column_name;

-- 5. Count knowledge items to verify data is accessible
SELECT
  COUNT(*) as total_knowledge_items,
  COUNT(DISTINCT project_id) as projects_with_knowledge
FROM aloa_project_knowledge
WHERE is_current = true;

-- 6. Show sample knowledge items for verification
SELECT
  id,
  project_id,
  source_type,
  source_name,
  category,
  importance_score,
  created_at
FROM aloa_project_knowledge
WHERE is_current = true
ORDER BY created_at DESC
LIMIT 10;