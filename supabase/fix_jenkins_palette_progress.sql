-- Fix Test Jenkins' palette cleanser progress record
-- The API requires a record in aloa_applet_progress to recognize the completion

-- First, get Test Jenkins' user ID
WITH user_info AS (
  SELECT id::text as user_id, email, full_name
  FROM aloa_user_profiles
  WHERE email = 'internetstuff@me.com'
  LIMIT 1
),
-- Get the palette cleanser applet ID for the project
palette_applet AS (
  SELECT a.id as applet_id
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  LIMIT 1
)
-- Insert the progress record
INSERT INTO aloa_applet_progress (
  id,
  applet_id,
  user_id,
  status,
  completed_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  palette_applet.applet_id,
  user_info.user_id,
  'completed',
  '2025-09-16 23:09:07.557145+00'::timestamp with time zone,
  '2025-09-16 23:09:07.557145+00'::timestamp with time zone,
  '2025-09-16 23:09:07.557145+00'::timestamp with time zone
FROM user_info, palette_applet
WHERE NOT EXISTS (
  -- Only insert if no record already exists
  SELECT 1
  FROM aloa_applet_progress ap
  WHERE ap.applet_id = palette_applet.applet_id
    AND ap.user_id = user_info.user_id
);

-- Verify the progress record was created
SELECT
  ap.*,
  u.email,
  u.full_name,
  a.name as applet_name,
  a.type as applet_type
FROM aloa_applet_progress ap
JOIN aloa_user_profiles u ON ap.user_id = u.id::text
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE u.email = 'internetstuff@me.com'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%');

-- Also verify the interaction data exists
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  jsonb_pretty(data) as data,
  created_at
FROM aloa_applet_interactions
WHERE user_email = 'internetstuff@me.com'
  AND interaction_type = 'submission'
ORDER BY created_at DESC
LIMIT 1;