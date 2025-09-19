-- Check the current state of the trigger function to see if our fix was applied

-- 1. Get the current source code of the trigger function
SELECT
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE proname = 'extract_applet_interaction_knowledge';

-- 2. Check if the trigger is enabled
SELECT
    tgname AS trigger_name,
    tgenabled AS is_enabled,
    tgtype
FROM pg_trigger
WHERE tgrelid = 'aloa_applet_interactions'::regclass
AND tgname LIKE '%knowledge%';

-- 3. Check the columns in aloa_applet_interactions
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'aloa_applet_interactions'
ORDER BY ordinal_position;

-- 4. Check if aloa_project_knowledge has the correct columns
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'aloa_project_knowledge'
ORDER BY ordinal_position;