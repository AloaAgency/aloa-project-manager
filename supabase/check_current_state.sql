-- Check if Test Jenkins has ANY progress records
SELECT
  COUNT(*) as total_progress_records,
  user_id
FROM aloa_applet_progress
WHERE user_id = 'internetstuff@me.com'
GROUP BY user_id;

-- Get ALL applet progress for Test Jenkins
SELECT
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.started_at,
  ap.completed_at,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com';

-- Find the palette cleanser applet ID for this project
SELECT
  a.id,
  a.name,
  a.type,
  pl.name as projectlet_name
FROM aloa_applets a
JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
WHERE pl.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND a.type = 'palette_cleanser';

-- Check if there's ANY progress for the palette cleanser
SELECT *
FROM aloa_applet_progress
WHERE applet_id IN (
  SELECT id FROM aloa_applets
  WHERE type = 'palette_cleanser'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  )
);

-- Insert progress record if it doesn't exist
INSERT INTO aloa_applet_progress (
  applet_id,
  user_id,
  project_id,
  status,
  started_at,
  completed_at,
  completion_percentage,
  created_at,
  updated_at
)
SELECT
  '913c4c26-8444-4c11-93be-b7373b429f94',
  'internetstuff@me.com',
  '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a',
  'in_progress',
  NOW() - INTERVAL '2 hours',
  NULL,
  50,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM aloa_applet_progress
  WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
    AND user_id = 'internetstuff@me.com'
)
RETURNING *;

-- Check the Pig applet
SELECT
  id,
  name,
  type,
  config
FROM aloa_applets
WHERE name ILIKE '%pig%'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );