-- Check for any triggers on aloa_projects table that might be causing issues
-- when updating knowledge base fields

-- 1. List all triggers on aloa_projects table
SELECT
  tgname as trigger_name,
  proname as function_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
  END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'aloa_projects'::regclass
  AND tgname NOT LIKE 'pg_%'  -- Exclude system triggers
  AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY tgname;

-- 2. Check if there's a trigger that inserts into aloa_project_knowledge
-- when updating aloa_projects
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%aloa_project_knowledge%'
  AND pg_get_functiondef(p.oid) LIKE '%INSERT%'
  AND p.proname LIKE '%project%';

-- 3. Disable any trigger that might be causing the issue
-- (we'll re-enable it later after fixing the root cause)
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  -- Find and disable triggers that might insert into aloa_project_knowledge
  FOR trigger_rec IN
    SELECT tgname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'aloa_projects'::regclass
      AND tgname NOT LIKE 'pg_%'
      AND tgname NOT LIKE 'RI_%'
      AND (
        tgname LIKE '%knowledge%'
        OR tgname LIKE '%extract%'
        OR pg_get_functiondef(p.oid) LIKE '%aloa_project_knowledge%'
      )
  LOOP
    EXECUTE 'ALTER TABLE aloa_projects DISABLE TRIGGER ' || trigger_rec.tgname;
    RAISE NOTICE 'Disabled trigger: %', trigger_rec.tgname;
  END LOOP;
END $$;

-- 4. Test if we can now update aloa_projects without issues
-- (Run this manually with your project ID)
-- UPDATE aloa_projects
-- SET google_drive_url = 'https://drive.google.com/test'
-- WHERE id = '511306f6-0316-4a60-a318-1509d643238a';