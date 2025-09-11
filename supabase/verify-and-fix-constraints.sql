-- Verify and fix the foreign key constraints

-- 1. First, check what constraint currently exists
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as references_table
FROM pg_constraint 
WHERE conname = 'aloa_applets_form_id_fkey';

-- 2. Drop ANY existing constraint on form_id column
ALTER TABLE aloa_applets
DROP CONSTRAINT IF EXISTS aloa_applets_form_id_fkey;

-- Also try with different possible names
ALTER TABLE aloa_applets
DROP CONSTRAINT IF EXISTS fk_aloa_applets_form_id;

ALTER TABLE aloa_applets
DROP CONSTRAINT IF EXISTS aloa_applets_form_id_forms_fkey;

-- 3. Clear the form_id that's causing issues (6b79631a-a950-4dc3-acea-cf2c17b89fc0)
UPDATE aloa_applets 
SET form_id = NULL, 
    config = jsonb_set(
        COALESCE(config, '{}'::jsonb), 
        '{form_id}', 
        'null'::jsonb
    )
WHERE form_id = '6b79631a-a950-4dc3-acea-cf2c17b89fc0';

-- 4. Clear ALL orphaned form references
UPDATE aloa_applets 
SET form_id = NULL, 
    config = jsonb_set(
        COALESCE(config, '{}'::jsonb), 
        '{form_id}', 
        'null'::jsonb
    )
WHERE form_id IS NOT NULL 
  AND form_id NOT IN (SELECT id FROM aloa_forms);

-- 5. Now add the correct constraint pointing to aloa_forms
ALTER TABLE aloa_applets
ADD CONSTRAINT aloa_applets_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES aloa_forms(id) 
ON DELETE SET NULL;

-- 6. Verify the new constraint is correct
SELECT 
    'New constraint check:' as status,
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as references_table
FROM pg_constraint 
WHERE conname = 'aloa_applets_form_id_fkey';

-- 7. Show current state
SELECT 
    'Applets with form_id set:' as status,
    COUNT(*) as count
FROM aloa_applets
WHERE form_id IS NOT NULL;

SELECT 
    'Forms in aloa_forms table:' as status,
    COUNT(*) as count
FROM aloa_forms;

-- 8. If you need to see what forms exist
SELECT 
    id,
    title,
    created_at
FROM aloa_forms
ORDER BY created_at DESC
LIMIT 10;