-- Final fix: Remove ON CONFLICT clause entirely from triggers

-- 1. Drop existing triggers and functions
DROP TRIGGER IF EXISTS extract_applet_interaction_knowledge_trigger ON aloa_applet_interactions;
DROP TRIGGER IF EXISTS extract_applet_config_knowledge_trigger ON aloa_applets;
DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE;
DROP FUNCTION IF EXISTS extract_applet_config_knowledge() CASCADE;

-- 2. Create simpler trigger function for applet interactions (NO ON CONFLICT)
CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  project_id_value UUID;
BEGIN
  -- Get project_id through joins
  SELECT p.project_id
  INTO project_id_value
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE a.id = NEW.applet_id;

  IF project_id_value IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Simple INSERT without ON CONFLICT
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
      project_id_value,
      'applet_interaction',
      NEW.id::text,
      'Applet Interaction',
      'structured_data',
      COALESCE(NEW.data::text, '{}'),
      'Applet interaction recorded',
      'functionality',
      ARRAY['applet', 'interaction'],
      5,
      'system_trigger',
      1.0,
      NOW(),
      true
    );
  EXCEPTION
    WHEN others THEN
      -- Silently ignore errors to not break applet creation
      NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create simpler trigger function for applet config (NO ON CONFLICT)
CREATE OR REPLACE FUNCTION extract_applet_config_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  project_id_value UUID;
BEGIN
  -- Get project_id through join
  SELECT p.project_id
  INTO project_id_value
  FROM aloa_projectlets p
  WHERE p.id = NEW.projectlet_id;

  IF project_id_value IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Simple INSERT without ON CONFLICT
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
      project_id_value,
      'applet_config',
      NEW.id::text,
      COALESCE(NEW.name, 'Applet'),
      'structured_data',
      jsonb_build_object(
        'type', NEW.type,
        'name', NEW.name,
        'config', NEW.config
      )::text,
      'Applet configured',
      'configuration',
      ARRAY[NEW.type::text],
      3,
      'system_trigger',
      1.0,
      NOW(),
      true
    );
  EXCEPTION
    WHEN others THEN
      -- Silently ignore errors to not break applet creation
      NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate triggers
CREATE TRIGGER extract_applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

CREATE TRIGGER extract_applet_config_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applets
FOR EACH ROW
EXECUTE FUNCTION extract_applet_config_knowledge();

-- 5. Test all applet types
DO $$
DECLARE
    test_projectlet_id UUID := 'aa6fde15-f4b3-42c5-a654-4790fd2bc045';
    test_applet_id UUID;
    test_types TEXT[] := ARRAY['form', 'upload', 'link_submission', 'sitemap', 'client_review'];
    test_type TEXT;
BEGIN
    FOREACH test_type IN ARRAY test_types
    LOOP
        BEGIN
            INSERT INTO aloa_applets (
                projectlet_id,
                name,
                type,
                order_index,
                config,
                form_id
            ) VALUES (
                test_projectlet_id,
                'Test ' || test_type,
                test_type::applet_type,
                999,
                '{}'::jsonb,
                NULL
            ) RETURNING id INTO test_applet_id;

            RAISE NOTICE '✅ % applet works!', test_type;

            -- Clean up
            DELETE FROM aloa_project_knowledge WHERE source_id = test_applet_id::text;
            DELETE FROM aloa_applets WHERE id = test_applet_id;

        EXCEPTION
            WHEN others THEN
                RAISE NOTICE '❌ % applet failed: %', test_type, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Test complete. Triggers simplified and should not block applet creation.';
END $$;