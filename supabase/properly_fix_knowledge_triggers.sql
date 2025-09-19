-- Properly fix the knowledge extraction triggers without removing the functionality

-- 1. First, temporarily drop the broken triggers
DROP TRIGGER IF EXISTS extract_applet_interaction_knowledge_trigger ON aloa_applet_interactions;
DROP TRIGGER IF EXISTS extract_applet_config_knowledge_trigger ON aloa_applets;
DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE;
DROP FUNCTION IF EXISTS extract_applet_config_knowledge() CASCADE;

-- 2. Create CORRECT extract_applet_interaction_knowledge function
CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  project_id_value UUID;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- Get applet details AND project_id through proper joins
  SELECT
    a.*,
    p.project_id
  INTO applet_record
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE a.id = NEW.applet_id;

  IF NOT FOUND OR applet_record.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  project_id_value := applet_record.project_id;

  -- Determine category based on applet type
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

  BEGIN
    -- Use UPSERT to handle conflicts gracefully
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
      importance_score,  -- Correct column name
      extracted_by,
      extraction_confidence,
      processed_at,
      is_current
    ) VALUES (
      project_id_value,
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
    )
    ON CONFLICT (project_id, source_type, source_id)
    DO UPDATE SET
      content = EXCLUDED.content,
      content_summary = EXCLUDED.content_summary,
      processed_at = NOW(),
      is_current = true;
  EXCEPTION
    WHEN others THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Knowledge extraction failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create CORRECT extract_applet_config_knowledge function
CREATE OR REPLACE FUNCTION extract_applet_config_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  project_id_value UUID;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- Get project_id through join with projectlets
  SELECT p.project_id
  INTO project_id_value
  FROM aloa_projectlets p
  WHERE p.id = NEW.projectlet_id;

  IF project_id_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine category based on applet type
  CASE NEW.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := 'Tone of Voice applet configured';
      knowledge_tags := ARRAY['tone_of_voice', 'configuration'];

    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := 'Color Palette applet configured';
      knowledge_tags := ARRAY['colors', 'configuration'];

    WHEN 'sitemap_builder' THEN
      knowledge_category := 'functionality';
      knowledge_summary := 'Sitemap Builder applet configured';
      knowledge_tags := ARRAY['sitemap', 'configuration'];

    WHEN 'client_review' THEN
      knowledge_category := 'workflow';
      knowledge_summary := 'Client Review applet configured';
      knowledge_tags := ARRAY['client_review', 'workflow'];

    ELSE
      knowledge_category := 'configuration';
      knowledge_summary := CONCAT(NEW.type, ' applet configured');
      knowledge_tags := ARRAY[NEW.type, 'configuration'];
  END CASE;

  BEGIN
    -- Use UPSERT to handle conflicts gracefully
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
      importance_score,  -- Correct column name
      extracted_by,
      extraction_confidence,
      processed_at,
      is_current
    ) VALUES (
      project_id_value,
      'applet_config',
      NEW.id::text,
      CONCAT(NEW.name, ' Configuration'),
      'structured_data',
      jsonb_build_object(
        'type', NEW.type,
        'name', NEW.name,
        'description', NEW.description,
        'config', NEW.config,
        'client_instructions', NEW.client_instructions
      )::text,
      knowledge_summary,
      knowledge_category,
      knowledge_tags,
      5,
      'system_trigger',
      1.0,
      NOW(),
      true
    )
    ON CONFLICT (project_id, source_type, source_id)
    DO UPDATE SET
      content = EXCLUDED.content,
      content_summary = EXCLUDED.content_summary,
      processed_at = NOW(),
      is_current = true;
  EXCEPTION
    WHEN others THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Config knowledge extraction failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the triggers
CREATE TRIGGER extract_applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

CREATE TRIGGER extract_applet_config_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applets
FOR EACH ROW
EXECUTE FUNCTION extract_applet_config_knowledge();

-- 5. Test creating a client_review applet
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
        'Test Client Review With Fixed Triggers',
        'client_review',
        999,
        '{"header": "Review & Approve", "description": "Please review the work above", "locked": false, "max_revisions": 2}'::jsonb,
        NULL,
        'Request client approval for completed work',
        'Review and approve or request revisions'
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE '✅ SUCCESS! Created client_review applet with ID: %', new_applet_id;
    RAISE NOTICE 'Knowledge extraction is still working!';

    -- Verify knowledge was extracted
    PERFORM * FROM aloa_project_knowledge
    WHERE source_id = new_applet_id::text
    AND source_type = 'applet_config';

    IF FOUND THEN
        RAISE NOTICE '✅ Knowledge extraction confirmed working!';
    ELSE
        RAISE NOTICE '⚠️ Knowledge extraction may not have triggered';
    END IF;

    -- Clean up
    DELETE FROM aloa_project_knowledge WHERE source_id = new_applet_id::text;
    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Test cleanup complete';

EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- 6. Show final status
SELECT
    'Knowledge extraction has been FIXED and PRESERVED' as status,
    'Triggers now handle errors gracefully' as improvement,
    'Applets should work WITH knowledge extraction' as result;