-- Fix Test Jenkins' progress record - Version 2
-- The issue: The previous insert may have included a project_id field that doesn't exist

-- First, check the actual columns in aloa_applet_progress
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'aloa_applet_progress'
ORDER BY ordinal_position;

-- Delete any incorrect records first
DELETE FROM aloa_applet_progress
WHERE user_id = (SELECT id::text FROM aloa_user_profiles WHERE email = 'internetstuff@me.com' LIMIT 1)
  AND applet_id IN (
    SELECT a.id
    FROM aloa_applets a
    JOIN aloa_projectlets p ON a.projectlet_id = p.id
    WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
      AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  );

-- Now insert the correct progress record
WITH user_info AS (
  SELECT id::text as user_id
  FROM aloa_user_profiles
  WHERE email = 'internetstuff@me.com'
  LIMIT 1
),
palette_applet AS (
  SELECT a.id as applet_id
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  LIMIT 1
)
INSERT INTO aloa_applet_progress (
  applet_id,
  user_id,
  status,
  completion_percentage,
  completed_at,
  started_at
)
SELECT
  palette_applet.applet_id,
  user_info.user_id,
  'completed',
  100,
  '2025-09-16 23:09:07.557145+00'::timestamp with time zone,
  '2025-09-16 23:09:00.000000+00'::timestamp with time zone
FROM user_info, palette_applet
WHERE NOT EXISTS (
  SELECT 1
  FROM aloa_applet_progress ap
  WHERE ap.applet_id = palette_applet.applet_id
    AND ap.user_id = user_info.user_id
);

-- Verify the record was created correctly
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

-- Also check that the applet_id matches what the API is looking for
SELECT
  a.id as applet_id,
  a.name,
  a.type,
  p.project_id
FROM aloa_applets a
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%');