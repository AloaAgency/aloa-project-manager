-- Fix ALL knowledge extraction functions and triggers

-- 1. First, check what extract_applet_config_knowledge does
SELECT
    'extract_applet_config_knowledge source check:' as function_name,
    CASE
        WHEN prosrc LIKE '%NEW.project_id%' THEN '❌ HAS BUG: Uses NEW.project_id'
        ELSE '✅ OK: No NEW.project_id'
    END as project_id_issue,
    CASE
        WHEN prosrc LIKE '%importance,%' OR prosrc LIKE '%importance)%' THEN '❌ HAS BUG: Uses wrong column (importance)'
        ELSE '✅ OK: Column name correct'
    END as column_issue
FROM pg_proc
WHERE proname = 'extract_applet_config_knowledge';

-- 2. Check triggers that use extract_applet_config_knowledge
SELECT
    'Triggers using extract_applet_config_knowledge:' as info,
    t.tgname,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE p.proname = 'extract_applet_config_knowledge';

-- 3. DROP ALL problematic triggers and functions
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    RAISE NOTICE '=== DROPPING ALL KNOWLEDGE EXTRACTION TRIGGERS ===';

    -- Drop all triggers that use knowledge extraction functions
    FOR trigger_rec IN
        SELECT DISTINCT t.tgname, c.relname
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE p.proname IN ('extract_applet_interaction_knowledge', 'extract_applet_config_knowledge')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', trigger_rec.tgname, trigger_rec.relname);
        RAISE NOTICE 'Dropped trigger: % on %', trigger_rec.tgname, trigger_rec.relname;
    END LOOP;

    -- Drop the functions
    DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE;
    DROP FUNCTION IF EXISTS extract_applet_config_knowledge() CASCADE;
    RAISE NOTICE 'Dropped all knowledge extraction functions';
END $$;

-- 4. Create CORRECT extract_applet_interaction_knowledge function
CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  project_id_value UUID;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- CORRECT: Get project_id through joins
  SELECT
    a.*,
    p.project_id
  INTO applet_record
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE a.id = NEW.applet_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  project_id_value := applet_record.project_id;

  CASE applet_record.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := 'Tone of Voice selection';
      knowledge_tags := ARRAY['tone_of_voice', 'content'];
    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := 'Color Palette selection';
      knowledge_tags := ARRAY['colors', 'design'];
    WHEN 'client_review' THEN
      knowledge_category := 'feedback';
      knowledge_summary := 'Client review feedback';
      knowledge_tags := ARRAY['client_review', 'feedback'];
    ELSE
      knowledge_category := 'functionality';
      knowledge_summary := applet_record.type || ' interaction';
      knowledge_tags := ARRAY[applet_record.type];
  END CASE;

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
    importance_score,  -- CORRECT column name
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    project_id_value,
    'applet_interaction',
    NEW.id::text,
    applet_record.name || ' - ' || NEW.interaction_type,
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
    processed_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create CORRECT extract_applet_config_knowledge function
CREATE OR REPLACE FUNCTION extract_applet_config_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  project_id_value UUID;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- CORRECT: Get project_id through join with projectlets
  SELECT p.project_id
  INTO project_id_value
  FROM aloa_projectlets p
  WHERE p.id = NEW.projectlet_id;

  IF project_id_value IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := 'Tone of Voice applet configured';
      knowledge_tags := ARRAY['tone_of_voice', 'config'];
    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := 'Color Palette applet configured';
      knowledge_tags := ARRAY['colors', 'config'];
    WHEN 'client_review' THEN
      knowledge_category := 'workflow';
      knowledge_summary := 'Client Review applet configured';
      knowledge_tags := ARRAY['client_review', 'workflow'];
    ELSE
      knowledge_category := 'configuration';
      knowledge_summary := NEW.type || ' applet configured';
      knowledge_tags := ARRAY[NEW.type, 'config'];
  END CASE;

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
    importance_score,  -- CORRECT column name
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    project_id_value,
    'applet_config',
    NEW.id::text,
    NEW.name || ' Configuration',
    'structured_data',
    jsonb_build_object(
      'type', NEW.type,
      'name', NEW.name,
      'config', NEW.config
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
    processed_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Recreate the triggers
CREATE TRIGGER extract_applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

CREATE TRIGGER extract_applet_config_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applets
FOR EACH ROW
EXECUTE FUNCTION extract_applet_config_knowledge();

-- 7. Verify the fixes
SELECT
    'Functions after fix:' as status,
    p.proname,
    CASE
        WHEN prosrc LIKE '%NEW.project_id%' THEN '❌ STILL BROKEN'
        ELSE '✅ FIXED'
    END as project_id_check,
    CASE
        WHEN prosrc LIKE '%importance_score%' THEN '✅ Uses importance_score'
        ELSE '❌ Wrong column'
    END as column_check
FROM pg_proc p
WHERE proname IN ('extract_applet_interaction_knowledge', 'extract_applet_config_knowledge');

-- 8. Test creating a client_review applet
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
        form_id
    ) VALUES (
        test_projectlet_id,
        'Final Test Client Review',
        'client_review',
        999,
        '{"header": "Review & Approve", "locked": false}'::jsonb,
        NULL
    ) RETURNING id INTO new_applet_id;

    RAISE NOTICE '✅ SUCCESS! Created client_review applet: %', new_applet_id;

    DELETE FROM aloa_applets WHERE id = new_applet_id;
    RAISE NOTICE 'Test applet cleaned up';

EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;