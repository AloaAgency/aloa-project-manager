-- COMPREHENSIVE FIX FOR BOTH ISSUES

-- 1. First, check current state of palette cleanser for Test Jenkins
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND a.type = 'palette_cleanser';

-- 2. Force palette cleanser to be in-progress (clear completed_at completely)
UPDATE aloa_applet_progress
SET
  status = 'in_progress',
  started_at = NOW() - INTERVAL '2 hours',
  completed_at = NULL,
  completion_percentage = 50,
  updated_at = NOW()
WHERE user_id = 'internetstuff@me.com'
  AND applet_id = '913c4c26-8444-4c11-93be-b7373b429f94';

-- 3. Verify the update
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

-- 4. Check the Pig applet config to see if files are there
SELECT
  id,
  name,
  type,
  jsonb_pretty(config) as config,
  config->'files' as files_array
FROM aloa_applets
WHERE id = 'd1cc582c-bef8-4258-b993-31c50b674f4f';

-- 5. If files aren't showing, let's ensure the config has the proper structure
-- This will show us exactly what's in the config field
SELECT
  id,
  name,
  config::text as raw_config
FROM aloa_applets
WHERE id = 'd1cc582c-bef8-4258-b993-31c50b674f4f';