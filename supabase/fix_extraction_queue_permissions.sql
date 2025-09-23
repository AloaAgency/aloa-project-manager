-- Fix permissions for aloa_knowledge_extraction_queue table
-- The extraction_status column exists but triggers can't access it due to permissions

-- First, ensure RLS is enabled but with permissive policies for the service role
ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can do everything" ON aloa_knowledge_extraction_queue;
DROP POLICY IF EXISTS "Allow insert from triggers" ON aloa_knowledge_extraction_queue;
DROP POLICY IF EXISTS "Allow select for all" ON aloa_knowledge_extraction_queue;

-- Create permissive policies for the service role and triggers
CREATE POLICY "Service role can do everything"
ON aloa_knowledge_extraction_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow triggers to insert
CREATE POLICY "Allow insert from triggers"
ON aloa_knowledge_extraction_queue
FOR INSERT
WITH CHECK (true);

-- Allow select for monitoring
CREATE POLICY "Allow select for all"
ON aloa_knowledge_extraction_queue
FOR SELECT
USING (true);

-- Grant necessary permissions to the functions
GRANT ALL ON aloa_knowledge_extraction_queue TO service_role;
GRANT INSERT, SELECT ON aloa_knowledge_extraction_queue TO authenticated;
GRANT INSERT, SELECT ON aloa_knowledge_extraction_queue TO anon;

-- Also ensure the sequence permissions if there's an id column
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Test that we can now insert into the table
DO $$
BEGIN
  -- Try to insert a test record (will rollback)
  INSERT INTO aloa_knowledge_extraction_queue (
    project_id,
    source_type,
    source_id,
    extraction_status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'test',
    'test-id',
    'pending',
    NOW()
  );

  -- If we get here, it worked
  RAISE NOTICE 'Test insert successful - permissions are fixed';

  -- Rollback the test insert
  ROLLBACK;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;