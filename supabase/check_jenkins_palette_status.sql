-- Check Test Jenkins' palette cleanser data status

-- 1. Check if Test Jenkins has any palette cleanser interactions
SELECT
  id,
  applet_id,
  project_id,
  user_email,
  interaction_type,
  jsonb_pretty(data) as data,
  created_at
FROM aloa_applet_interactions
WHERE user_email = 'internetstuff@me.com'
  AND (interaction_type = 'submission' OR interaction_type = 'palette_selection')
ORDER BY created_at DESC;

-- 2. Check if there's a completion record in aloa_applet_progress
SELECT
  ap.*,
  u.email,
  u.full_name
FROM aloa_applet_progress ap
LEFT JOIN aloa_user_profiles u ON ap.user_id = u.id
WHERE u.email = 'internetstuff@me.com'
  AND ap.applet_id IN (
    SELECT id FROM aloa_applets
    WHERE type = 'palette_cleanser'
    OR name ILIKE '%palette%'
  );

-- 3. Check what palette cleanser applets exist for the project
SELECT
  a.id,
  a.name,
  a.type,
  a.config,
  p.name as projectlet_name
FROM aloa_applets a
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%');

-- 4. Check if Test Jenkins is properly set up as a user
SELECT
  id,
  email,
  full_name,
  role
FROM aloa_user_profiles
WHERE email = 'internetstuff@me.com';

-- 5. Check if the API is looking for the right applet ID
-- Get the palette cleanser applet ID for the project
SELECT
  a.id as applet_id,
  a.name,
  a.type
FROM aloa_applets a
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
LIMIT 1;