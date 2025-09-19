-- Trigger knowledge extraction for a project
-- Run this after updating project knowledge base fields

-- Replace this with your actual project ID
DO $$
DECLARE
  v_project_id UUID := '511306f6-0316-4a60-a318-1509d643238a';
BEGIN
  -- Queue extraction for website if URL exists
  IF EXISTS (
    SELECT 1 FROM aloa_projects
    WHERE id = v_project_id
    AND existing_url IS NOT NULL
    AND existing_url != ''
  ) THEN
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
      v_project_id,
      'website',
      existing_url,
      jsonb_build_object(
        'url', existing_url,
        'extraction_type', 'website_content'
      ),
      'pending',
      10, -- High priority
      NOW()
    FROM aloa_projects
    WHERE id = v_project_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Queued website extraction for project %', v_project_id;
  END IF;

  -- Queue extraction for Google Drive if URL exists
  IF EXISTS (
    SELECT 1 FROM aloa_projects
    WHERE id = v_project_id
    AND google_drive_url IS NOT NULL
    AND google_drive_url != ''
  ) THEN
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
      v_project_id,
      'google_drive',
      google_drive_url,
      jsonb_build_object(
        'url', google_drive_url,
        'extraction_type', 'google_drive_content'
      ),
      'pending',
      8, -- Medium-high priority
      NOW()
    FROM aloa_projects
    WHERE id = v_project_id
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Queued Google Drive extraction for project %', v_project_id;
  END IF;

  -- Process base knowledge immediately if it exists
  IF EXISTS (
    SELECT 1 FROM aloa_projects
    WHERE id = v_project_id
    AND base_knowledge IS NOT NULL
    AND base_knowledge != ''
  ) THEN
    INSERT INTO aloa_project_knowledge (
      project_id,
      source_type,
      source_id,
      source_name,
      content_type,
      content,
      content_summary,
      category,
      tags,
      importance_score,
      extracted_by,
      extraction_confidence,
      is_current
    )
    SELECT
      v_project_id,
      'manual',
      'base_knowledge',
      'Base Project Knowledge',
      'text',
      base_knowledge,
      'Manual project notes and context',
      'project_overview',
      ARRAY['manual', 'base_knowledge'],
      8,
      'system',
      1.0,
      true
    FROM aloa_projects
    WHERE id = v_project_id
    ON CONFLICT (project_id, source_type, source_id)
    DO UPDATE SET
      content = EXCLUDED.content,
      updated_at = NOW(),
      is_current = true;

    RAISE NOTICE 'Stored base knowledge for project %', v_project_id;
  END IF;

  -- Update knowledge_updated_at timestamp
  UPDATE aloa_projects
  SET knowledge_updated_at = NOW()
  WHERE id = v_project_id;

END $$;

-- Check extraction queue status
SELECT
  source_type,
  source_id,
  status,
  priority,
  created_at
FROM aloa_knowledge_extraction_queue
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY priority DESC, created_at DESC;

-- Check knowledge items
SELECT
  source_type,
  source_name,
  category,
  importance_score,
  created_at
FROM aloa_project_knowledge
WHERE project_id = '511306f6-0316-4a60-a318-1509d643238a'
ORDER BY importance_score DESC, created_at DESC;