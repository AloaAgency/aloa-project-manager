-- Final fix for both issues

-- 1. Fix palette cleanser to show "Resume" by clearing completed_at
UPDATE aloa_applet_progress
SET
  status = 'in_progress',
  completed_at = NULL,  -- This is the key - clear completed_at so isInProgress = true
  completion_percentage = 50,
  updated_at = NOW()
WHERE user_id = 'internetstuff@me.com'
  AND applet_id = '913c4c26-8444-4c11-93be-b7373b429f94';

-- Verify the update worked
SELECT
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.started_at,
  ap.completed_at,
  ap.completion_percentage,
  a.name
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND ap.applet_id = '913c4c26-8444-4c11-93be-b7373b429f94';

-- 2. Check if files exist in the database for any upload applets
SELECT
  pf.id,
  pf.applet_id,
  pf.file_name,
  pf.file_size,
  pf.url,
  a.name as applet_name
FROM aloa_project_files pf
JOIN aloa_applets a ON pf.applet_id = a.id
WHERE pf.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND a.type = 'upload'
ORDER BY pf.created_at DESC;

-- If no files exist, let's check all files for this project
SELECT
  id,
  applet_id,
  file_name,
  file_size,
  url,
  created_at
FROM aloa_project_files
WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
ORDER BY created_at DESC
LIMIT 10;

-- Get the Pig applet ID
SELECT
  id,
  name,
  type,
  config
FROM aloa_applets
WHERE name LIKE '%Pig%'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );