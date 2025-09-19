-- Manual fix for the specific palette cleanser that isn't staying completed
-- Replace USER_ID with your actual user ID

-- First, check current status
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.id = '7ddd442b-cc8e-425b-9b5e-9ef0af22e8df';

-- Manually update to completed if it exists but isn't marked completed
UPDATE aloa_applet_progress
SET
  status = 'completed',
  completed_at = NOW(),
  completion_percentage = 100,
  updated_at = NOW()
WHERE
  applet_id = '7ddd442b-cc8e-425b-9b5e-9ef0af22e8df'
  AND (status != 'completed' OR completed_at IS NULL);

-- Verify the update
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.id = '7ddd442b-cc8e-425b-9b5e-9ef0af22e8df';

-- Test calling the function directly with your user ID
-- Uncomment and replace YOUR_USER_ID with actual value
-- SELECT * FROM update_applet_progress(
--   '7ddd442b-cc8e-425b-9b5e-9ef0af22e8df'::uuid,
--   'YOUR_USER_ID',
--   'aa6fde15-f4b3-42c5-a654-4790fd2bc045'::uuid,  -- projectlet_id as project_id
--   'completed',
--   100,
--   null
-- );