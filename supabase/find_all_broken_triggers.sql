-- Find ALL triggers and functions that might be causing the issue

-- 1. Find ALL functions that reference NEW.project_id
SELECT
    proname AS function_name,
    'Has NEW.project_id reference' as issue
FROM pg_proc
WHERE prosrc LIKE '%NEW.project_id%';

-- 2. Find ALL functions that reference the wrong column name 'importance'
SELECT
    proname AS function_name,
    'Uses wrong column name (importance instead of importance_score)' as issue
FROM pg_proc
WHERE prosrc LIKE '%aloa_project_knowledge%'
AND prosrc LIKE '%importance%'
AND prosrc NOT LIKE '%importance_score%';

-- 3. Show ALL triggers that might fire on INSERT to aloa_applets
SELECT
    ns.nspname AS schema_name,
    t.tgname AS trigger_name,
    p.proname AS function_name,
    CASE
        WHEN tgtype & 4 = 4 THEN 'Fires on INSERT'
        ELSE 'Does not fire on INSERT'
    END as insert_trigger
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace ns ON c.relnamespace = ns.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'aloa_applets'
AND t.tgname NOT LIKE 'RI_%';

-- 4. Show ALL triggers on aloa_applet_interactions
SELECT
    ns.nspname AS schema_name,
    t.tgname AS trigger_name,
    p.proname AS function_name,
    t.tgenabled as is_enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace ns ON c.relnamespace = ns.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'aloa_applet_interactions'
AND t.tgname NOT LIKE 'RI_%';

-- 5. Get the ACTUAL source code of the extract_applet_interaction_knowledge function
SELECT
    'Current function source:' as info,
    prosrc
FROM pg_proc
WHERE proname = 'extract_applet_interaction_knowledge';

-- 6. Check if there are multiple versions of the function in different schemas
SELECT
    ns.nspname AS schema_name,
    p.proname AS function_name,
    'Possible duplicate function' as note
FROM pg_proc p
JOIN pg_namespace ns ON p.pronamespace = ns.oid
WHERE p.proname LIKE '%extract%applet%'
OR p.proname LIKE '%applet%knowledge%';