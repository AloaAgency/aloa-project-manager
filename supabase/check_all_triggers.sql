-- Check ALL triggers that might be interfering with client_review applet creation

-- 1. Check triggers on aloa_applets table
SELECT
    'aloa_applets' as table_name,
    tgname AS trigger_name,
    tgtype,
    tgenabled,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'aloa_applets'::regclass
AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY tgname;

-- 2. Check triggers on aloa_applet_interactions table
SELECT
    'aloa_applet_interactions' as table_name,
    tgname AS trigger_name,
    tgtype,
    tgenabled,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'aloa_applet_interactions'::regclass
AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY tgname;

-- 3. Check if there are any functions that reference aloa_applets and project_id
SELECT
    proname AS function_name,
    'May reference aloa_applets and project_id' as note
FROM pg_proc
WHERE prosrc LIKE '%aloa_applets%'
AND prosrc LIKE '%project_id%'
AND proname NOT IN ('extract_applet_interaction_knowledge');