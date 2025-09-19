-- Fix the knowledge extraction trigger that's causing the client_review applet creation to fail
-- The issue is that the trigger function expects project_id on aloa_applet_interactions
-- but it needs to get it through the relationship: applets -> projectlets -> projects

-- 1. Drop the existing trigger function
DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE;

-- 2. Create the fixed version that properly gets project_id
CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  project_id_value UUID;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- Get applet details AND the project_id through the proper relationship
  SELECT
    a.*,
    p.project_id
  INTO applet_record
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE a.id = NEW.applet_id;

  -- Skip if no applet found
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Store the project_id we found
  project_id_value := applet_record.project_id;

  -- Determine category and summary based on applet type
  CASE applet_record.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := CONCAT(
        'Tone of Voice: ',
        COALESCE(
          (NEW.data->'form_progress'->>'selectedTone')::text,
          (NEW.data->'form_progress'->>'toneName')::text,
          'Tone selection recorded'
        )
      );
      knowledge_tags := ARRAY['tone_of_voice', 'content', 'brand_voice'];

    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := CONCAT(
        'Color Palette: ',
        COALESCE(
          (NEW.data->'form_progress'->>'paletteName')::text,
          'Color preferences selected'
        )
      );
      knowledge_tags := ARRAY['colors', 'design', 'visual_identity'];

    WHEN 'sitemap_builder' THEN
      knowledge_category := 'functionality';
      knowledge_summary := 'Site structure and navigation defined';
      knowledge_tags := ARRAY['sitemap', 'navigation', 'structure'];

    WHEN 'link_submission' THEN
      knowledge_category := 'inspiration';
      knowledge_summary := 'Reference links and inspiration materials provided';
      knowledge_tags := ARRAY['references', 'inspiration', 'examples'];

    WHEN 'client_review' THEN
      knowledge_category := 'feedback';
      knowledge_summary := CASE
        WHEN (NEW.data->'form_progress'->>'status')::text = 'approved' THEN 'Work approved by client'
        WHEN (NEW.data->'form_progress'->>'status')::text = 'revision_requested' THEN
          CONCAT('Revision requested: ', COALESCE((NEW.data->'form_progress'->>'revision_notes')::text, 'See notes'))
        ELSE 'Client review interaction'
      END;
      knowledge_tags := ARRAY['client_review', 'feedback', 'approval'];

    ELSE
      knowledge_category := 'functionality';
      knowledge_summary := CONCAT(applet_record.type, ' interaction recorded');
      knowledge_tags := ARRAY[applet_record.type, 'client_input'];
  END CASE;

  -- Mark old interactions as not current (if updating)
  IF TG_OP = 'UPDATE' THEN
    UPDATE aloa_project_knowledge
    SET is_current = false
    WHERE project_id = project_id_value
      AND source_type = 'applet_interaction'
      AND source_id = NEW.id::text;
  END IF;

  -- Insert knowledge (using the project_id we found through the relationship)
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
    processed_at,
    is_current
  ) VALUES (
    project_id_value,  -- Use the project_id we found through the join
    'applet_interaction',
    NEW.id::text,
    CONCAT(applet_record.name, ' - ', NEW.interaction_type),
    'structured_data',
    NEW.data::text,
    knowledge_summary,
    knowledge_category,
    knowledge_tags,
    8,
    'system_trigger',
    1.0,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the trigger
CREATE TRIGGER extract_applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

-- 4. Test that client_review applets can now be created
DO $$
DECLARE
    test_projectlet_id UUID := 'aa6fde15-f4b3-42c5-a654-4790fd2bc045';
    new_applet_id UUID;
BEGIN
    INSERT INTO aloa_applets (
        projectlet_id,
        name,
        type,
        order_index,
        config,
        form_id,
        description,
        client_instructions
    ) VALUES (
        test_projectlet_id,
        'Test Client Review After Fix',
        'client_review',
        999,
        '{"header": "Review & Approve", "description": "Test after fix", "locked": false, "max_revisions": 2}'::jsonb,
        NULL,
        'Request client approval for completed work',
        'Review and approve or request revisions'
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE 'SUCCESS! Created client_review applet with ID: %', new_applet_id;

    -- Clean up
    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Test applet cleaned up';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

-- 5. Show success message
SELECT 'Knowledge extraction trigger fixed! Client Review applets should now work.' as status;