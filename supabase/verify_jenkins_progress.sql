-- Verify Test Jenkins' progress record and debug why avatar isn't showing

-- 1. Check user profile
SELECT
  id,
  id::text as text_id,
  email,
  full_name,
  created_at
FROM aloa_user_profiles
WHERE email = 'internetstuff@me.com';

-- 2. Check palette cleanser applet
SELECT
  a.id,
  a.name,
  a.type,
  a.projectlet_id,
  p.project_id
FROM aloa_applets a
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%');

-- 3. Check progress records
SELECT
  ap.*,
  u.email,
  u.full_name,
  a.name as applet_name
FROM aloa_applet_progress ap
LEFT JOIN aloa_user_profiles u ON ap.user_id = u.id::text
LEFT JOIN aloa_applets a ON ap.applet_id = a.id
WHERE a.id IN (
  SELECT a.id
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
);

-- 4. Check if there's a type mismatch in the progress table
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'aloa_applet_progress'
  AND column_name IN ('user_id', 'applet_id');

-- 5. Check interaction data
SELECT
  ai.id,
  ai.applet_id,
  ai.user_email,
  ai.interaction_type,
  ai.created_at,
  jsonb_pretty(ai.data) as data
FROM aloa_applet_interactions ai
WHERE ai.user_email = 'internetstuff@me.com'
  AND ai.interaction_type = 'submission'
ORDER BY ai.created_at DESC;

-- 6. Try to manually verify the exact query the API is running
-- This mimics the API query structure
WITH palette_applet AS (
  SELECT a.id
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  LIMIT 1
)
SELECT
  ap.id,
  ap.user_id,
  ap.status,
  ap.completion_percentage,
  ap.completed_at,
  ap.started_at,
  ap.form_progress
FROM aloa_applet_progress ap
WHERE ap.applet_id = (SELECT id FROM palette_applet)
  AND ap.status = 'completed';

-- 7. Check if the problem is the project_id column
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'aloa_applet_progress'
ORDER BY ordinal_position;