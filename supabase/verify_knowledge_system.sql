-- =========================================
-- VERIFY PROJECT KNOWLEDGE SYSTEM
-- =========================================

-- 1. Check if tables exist
SELECT
  'Tables Check' as test_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_knowledge') as knowledge_table_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_knowledge_extraction_queue') as queue_table_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_ai_context_cache') as cache_table_exists,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_knowledge_relationships') as relationships_table_exists;

-- 2. Check current knowledge items
SELECT
  'Knowledge Items' as test_name,
  COUNT(*) as total_items,
  COUNT(DISTINCT project_id) as projects_with_knowledge,
  COUNT(DISTINCT source_type) as source_types_used,
  COUNT(DISTINCT category) as categories_used
FROM aloa_project_knowledge
WHERE is_current = true;

-- 3. Show knowledge by source type
SELECT
  source_type,
  COUNT(*) as count,
  AVG(importance_score) as avg_importance
FROM aloa_project_knowledge
WHERE is_current = true
GROUP BY source_type
ORDER BY count DESC;

-- 4. Show knowledge by category
SELECT
  COALESCE(category, 'uncategorized') as category,
  COUNT(*) as count,
  AVG(importance_score) as avg_importance
FROM aloa_project_knowledge
WHERE is_current = true
GROUP BY category
ORDER BY count DESC;

-- 5. Check extraction queue status
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_item,
  MAX(created_at) as newest_item
FROM aloa_knowledge_extraction_queue
GROUP BY status;

-- 6. Check if triggers are installed
SELECT
  'Triggers Check' as test_name,
  EXISTS(
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_extract_knowledge_from_form_response'
  ) as form_response_trigger_exists,
  EXISTS(
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_extract_knowledge_from_file_upload'
  ) as file_upload_trigger_exists;

-- 7. Show recent knowledge items (last 5)
SELECT
  substring(id::text, 1, 8) as id,
  source_type,
  source_name,
  category,
  importance_score,
  created_at
FROM aloa_project_knowledge
ORDER BY created_at DESC
LIMIT 5;

-- 8. Test: Insert a test knowledge item and then delete it
DO $$
DECLARE
  test_project_id UUID;
  test_knowledge_id UUID;
BEGIN
  -- Get any existing project ID for testing
  SELECT id INTO test_project_id FROM aloa_projects LIMIT 1;

  IF test_project_id IS NOT NULL THEN
    -- Insert test knowledge
    INSERT INTO aloa_project_knowledge (
      project_id,
      source_type,
      source_name,
      content_type,
      content,
      content_summary,
      category,
      importance_score,
      extracted_by
    ) VALUES (
      test_project_id,
      'team_notes',
      'System Verification Test',
      'text',
      'Test knowledge item created for system verification',
      'Test item',
      'technical_specs',
      1,
      'system'
    ) RETURNING id INTO test_knowledge_id;

    -- Delete the test item
    DELETE FROM aloa_project_knowledge WHERE id = test_knowledge_id;

    RAISE NOTICE '✅ Knowledge system test successful - able to insert and delete';
  ELSE
    RAISE NOTICE '⚠️  No projects found for testing - create a project first';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Knowledge system test failed: %', SQLERRM;
END $$;

-- 9. Show summary
SELECT
  '🎯 SYSTEM STATUS' as status,
  CASE
    WHEN EXISTS(SELECT 1 FROM aloa_project_knowledge)
    THEN '✅ System has knowledge data'
    ELSE '⚠️  No knowledge data yet - interact with applets to generate data'
  END as message;