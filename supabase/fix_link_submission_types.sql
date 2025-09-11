-- Fix link_submission applets that have null or missing type field
-- This happens when applets are created from library but type isn't properly set

-- First, check which applets need fixing
SELECT 
  a.id,
  a.name,
  a.type,
  a.library_applet_id,
  l.type as library_type
FROM aloa_applets a
LEFT JOIN aloa_applet_library l ON a.library_applet_id = l.id
WHERE a.name = 'Link Submission' 
   OR l.type = 'link_submission'
   OR a.description LIKE '%Share deliverables and resources%';

-- Update applets to have the correct type based on their library applet
UPDATE aloa_applets a
SET type = l.type
FROM aloa_applet_library l
WHERE a.library_applet_id = l.id
  AND l.type = 'link_submission'
  AND (a.type IS NULL OR a.type != 'link_submission');

-- Also update any applets that have the Link Submission name but no type
UPDATE aloa_applets
SET type = 'link_submission'
WHERE name = 'Link Submission'
  AND (type IS NULL OR type != 'link_submission');

-- Verify the fix
SELECT 
  id,
  name,
  type,
  library_applet_id
FROM aloa_applets
WHERE name = 'Link Submission' OR type = 'link_submission';