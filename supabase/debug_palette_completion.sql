-- Debug script to check palette cleanser completion status

-- 1. Check the current progress records for palette cleanser applets
SELECT
  ap.id,
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.completed_at,
  ap.started_at,
  ap.completion_percentage,
  ap.updated_at,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser'
ORDER BY ap.updated_at DESC
LIMIT 10;

-- 2. Check if there are any palette cleanser applets
SELECT
  id,
  name,
  type,
  projectlet_id,
  config
FROM aloa_applets
WHERE type = 'palette_cleanser';

-- 3. Test the update_applet_progress function directly
-- Replace these values with actual IDs from the queries above
-- SELECT * FROM update_applet_progress(
--   'YOUR_APPLET_ID'::uuid,
--   'YOUR_USER_ID',
--   'YOUR_PROJECT_ID'::uuid,
--   'completed',
--   100,
--   null
-- );