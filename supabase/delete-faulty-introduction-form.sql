-- Delete the faulty introduction test form
-- This only deletes from aloa_forms, not from legacy forms table

DELETE FROM aloa_forms 
WHERE title ILIKE '%introduction%' 
   OR title ILIKE '%intro%'
   OR title ILIKE '%test%';

-- Verify deletion
SELECT 'Deleted forms:' as status, COUNT(*) as deleted_count
FROM aloa_forms 
WHERE title ILIKE '%introduction%' 
   OR title ILIKE '%intro%'
   OR title ILIKE '%test%';

-- Show remaining forms
SELECT id, title, created_at 
FROM aloa_forms 
ORDER BY created_at DESC;