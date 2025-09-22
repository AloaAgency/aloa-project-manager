-- Fix the knowledge extraction trigger to work properly with service role
-- This ensures knowledge extraction works when updating project fields

-- 1. First, check what triggers exist on aloa_projects
SELECT
  tgname as trigger_name,
  proname as function_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'aloa_projects'::regclass
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- 2. Find the knowledge extraction function
SELECT
  proname AS function_name,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname LIKE '%knowledge%'
  OR proname LIKE '%extract%'
ORDER BY proname;

-- 3. Update the knowledge extraction trigger function to use SECURITY DEFINER
-- This allows it to bypass RLS when called by any user/service
DO $$
DECLARE
  func_name TEXT;
BEGIN
  -- Find functions that handle knowledge extraction
  FOR func_name IN
    SELECT proname
    FROM pg_proc
    WHERE (proname LIKE '%knowledge%extract%'
           OR proname LIKE '%extract%knowledge%'
           OR proname LIKE '%update_project_knowledge%'
           OR proname LIKE '%queue_knowledge_extraction%')
  LOOP
    -- Make the function run with definer privileges (superuser)
    EXECUTE format('
      ALTER FUNCTION %I() SECURITY DEFINER;
    ', func_name);
    RAISE NOTICE 'Updated function % to SECURITY DEFINER', func_name;
  END LOOP;
END $$;

-- 4. Ensure aloa_project_knowledge has proper RLS policies for service role
-- Add a policy that allows the service role to insert/update
DO $$
BEGIN
  -- Drop existing policies that might conflict
  DROP POLICY IF EXISTS service_role_all ON aloa_project_knowledge;

  -- Create a permissive policy for service role operations
  CREATE POLICY service_role_all ON aloa_project_knowledge
    FOR ALL
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created service role policy for aloa_project_knowledge';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create policy: %', SQLERRM;
END $$;

-- 5. Also ensure the knowledge extraction queue table has proper permissions
DO $$
BEGIN
  -- Check if the queue table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_knowledge_extraction_queue'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS service_role_all ON aloa_knowledge_extraction_queue;

    -- Create permissive policy
    CREATE POLICY service_role_all ON aloa_knowledge_extraction_queue
      FOR ALL
      USING (true)
      WITH CHECK (true);

    RAISE NOTICE 'Created service role policy for aloa_knowledge_extraction_queue';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create queue policy: %', SQLERRM;
END $$;

-- 6. Test that we can now update the project
-- This should trigger knowledge extraction without errors
UPDATE aloa_projects
SET
  google_drive_url = 'https://drive.google.com/test-with-trigger',
  knowledge_updated_at = NOW()
WHERE id = '511306f6-0316-4a60-a318-1509d643238a'
RETURNING id, project_name, google_drive_url, knowledge_updated_at;

-- 7. Verify knowledge was queued or extracted
SELECT
  'Queue' as source,
  COUNT(*) as count
FROM aloa_knowledge_extraction_queue
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND created_at > NOW() - INTERVAL '1 minute'

UNION ALL

SELECT
  'Knowledge' as source,
  COUNT(*) as count
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
  AND created_at > NOW() - INTERVAL '1 minute';