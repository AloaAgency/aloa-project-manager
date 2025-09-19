-- Verify the current state and force fix the trigger

-- 1. Check if the old trigger still exists
SELECT
    'Current triggers on aloa_applet_interactions:' as info,
    tgname
FROM pg_trigger
WHERE tgrelid = 'aloa_applet_interactions'::regclass
AND tgname LIKE '%knowledge%';

-- 2. Check the current function source to see if it still has the bug
SELECT
    'Checking if function still has NEW.project_id bug:' as info,
    CASE
        WHEN prosrc LIKE '%NEW.project_id%' THEN '❌ BUG STILL EXISTS - function uses NEW.project_id directly'
        ELSE '✅ Function appears fixed'
    END as status,
    CASE
        WHEN prosrc LIKE '%importance_score%' THEN '✅ Uses correct column name (importance_score)'
        WHEN prosrc LIKE '%importance,%' OR prosrc LIKE '%importance)%' THEN '❌ BUG - Uses wrong column name (importance)'
        ELSE '❓ Cannot determine column usage'
    END as column_status
FROM pg_proc
WHERE proname = 'extract_applet_interaction_knowledge';

-- 3. FORCE drop everything and recreate
DO $$
BEGIN
    RAISE NOTICE '=== STARTING FORCED FIX ===';

    -- Drop trigger first
    EXECUTE 'DROP TRIGGER IF EXISTS extract_applet_interaction_knowledge_trigger ON aloa_applet_interactions CASCADE';
    RAISE NOTICE 'Dropped trigger';

    -- Drop function
    EXECUTE 'DROP FUNCTION IF EXISTS extract_applet_interaction_knowledge() CASCADE';
    RAISE NOTICE 'Dropped function';

    RAISE NOTICE 'Old trigger and function completely removed';
END $$;

-- 4. Create the CORRECT function (without any triggers initially)
CREATE OR REPLACE FUNCTION extract_applet_interaction_knowledge()
RETURNS TRIGGER AS $$
DECLARE
  applet_record RECORD;
  project_id_value UUID;
  knowledge_summary TEXT;
  knowledge_category TEXT;
  knowledge_tags TEXT[];
BEGIN
  -- CORRECT: Get project_id through proper joins
  SELECT
    a.*,
    p.project_id  -- Getting project_id from projectlets table
  INTO applet_record
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE a.id = NEW.applet_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  project_id_value := applet_record.project_id;

  -- Handle different applet types
  CASE applet_record.type
    WHEN 'tone_of_voice' THEN
      knowledge_category := 'content_strategy';
      knowledge_summary := 'Tone of Voice selection';
      knowledge_tags := ARRAY['tone_of_voice', 'content'];

    WHEN 'palette_cleanser' THEN
      knowledge_category := 'design_preferences';
      knowledge_summary := 'Color Palette selection';
      knowledge_tags := ARRAY['colors', 'design'];

    WHEN 'sitemap_builder' THEN
      knowledge_category := 'functionality';
      knowledge_summary := 'Site structure defined';
      knowledge_tags := ARRAY['sitemap', 'navigation'];

    WHEN 'client_review' THEN
      knowledge_category := 'feedback';
      knowledge_summary := 'Client review interaction';
      knowledge_tags := ARRAY['client_review', 'feedback'];

    ELSE
      knowledge_category := 'functionality';
      knowledge_summary := applet_record.type || ' interaction';
      knowledge_tags := ARRAY[applet_record.type];
  END CASE;

  -- Insert with CORRECT column name: importance_score NOT importance
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
    importance_score,  -- CORRECT column name!
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
  ) VALUES (
    project_id_value,  -- Using the value we got from the JOIN
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
    content_summary = EXCLUDED.content_summary,
    processed_at = NOW(),
    is_current = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the trigger
CREATE TRIGGER extract_applet_interaction_knowledge_trigger
AFTER INSERT OR UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION extract_applet_interaction_knowledge();

-- 6. Verify the fix
SELECT
    'After fix - Function check:' as info,
    CASE
        WHEN prosrc LIKE '%NEW.project_id%' THEN '❌ STILL BROKEN'
        ELSE '✅ FIXED - No direct NEW.project_id reference'
    END as project_id_status,
    CASE
        WHEN prosrc LIKE '%importance_score%' THEN '✅ FIXED - Uses importance_score'
        ELSE '❌ STILL BROKEN - Wrong column name'
    END as column_status
FROM pg_proc
WHERE proname = 'extract_applet_interaction_knowledge';

-- 7. Test applet creation
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
    RAISE NOTICE 'Cleaned up test applet';

EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE 'Error Code: %', SQLSTATE;
END $$;