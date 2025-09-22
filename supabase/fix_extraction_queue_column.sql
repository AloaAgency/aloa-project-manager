-- Fix the extraction_status column issue in aloa_knowledge_extraction_queue
-- The column might be named differently (e.g., status instead of extraction_status)

-- First check if the table exists and what columns it has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'aloa_knowledge_extraction_queue'
ORDER BY ordinal_position;

-- If the column is named 'status' instead of 'extraction_status', rename it
DO $$
BEGIN
  -- Check if 'status' column exists and 'extraction_status' doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_knowledge_extraction_queue'
    AND column_name = 'status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_knowledge_extraction_queue'
    AND column_name = 'extraction_status'
  ) THEN
    ALTER TABLE aloa_knowledge_extraction_queue
    RENAME COLUMN status TO extraction_status;
    RAISE NOTICE 'Renamed status column to extraction_status';
  -- If neither column exists, add extraction_status
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_knowledge_extraction_queue'
    AND column_name = 'extraction_status'
  ) THEN
    ALTER TABLE aloa_knowledge_extraction_queue
    ADD COLUMN extraction_status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Added extraction_status column';
  ELSE
    RAISE NOTICE 'extraction_status column already exists';
  END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'aloa_knowledge_extraction_queue'
ORDER BY ordinal_position;