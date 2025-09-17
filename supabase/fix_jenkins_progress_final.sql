-- Final fix for Test Jenkins' palette cleanser progress
-- This comprehensive script ensures the progress record exists with all required fields

-- 1. First check the table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'aloa_applet_progress'
ORDER BY ordinal_position;

-- 2. Get the exact user ID and applet ID we need
SELECT
  'User ID:' as label,
  u.id as uuid_id,
  u.id::text as text_id,
  u.email,
  u.full_name
FROM aloa_user_profiles u
WHERE u.email = 'internetstuff@me.com';

SELECT
  'Applet ID:' as label,
  a.id as applet_id,
  a.name,
  a.type,
  p.project_id
FROM aloa_applets a
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%');

-- 3. Delete any existing incomplete records
DELETE FROM aloa_applet_progress
WHERE user_id = (SELECT id::text FROM aloa_user_profiles WHERE email = 'internetstuff@me.com' LIMIT 1)
  AND applet_id IN (
    SELECT a.id
    FROM aloa_applets a
    JOIN aloa_projectlets p ON a.projectlet_id = p.id
    WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
      AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  );

-- 4. Insert the correct progress record with all required fields
WITH user_info AS (
  SELECT id::text as user_id
  FROM aloa_user_profiles
  WHERE email = 'internetstuff@me.com'
  LIMIT 1
),
palette_applet AS (
  SELECT a.id as applet_id, p.project_id
  FROM aloa_applets a
  JOIN aloa_projectlets p ON a.projectlet_id = p.id
  WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  LIMIT 1
)
INSERT INTO aloa_applet_progress (
  applet_id,
  user_id,
  project_id,  -- Include if column exists
  status,
  completion_percentage,
  completed_at,
  started_at,
  created_at,
  updated_at
)
SELECT
  palette_applet.applet_id,
  user_info.user_id,
  palette_applet.project_id,
  'completed',
  100,
  '2025-09-16 23:09:07.557145+00'::timestamp with time zone,
  '2025-09-16 23:09:00.000000+00'::timestamp with time zone,
  NOW(),
  NOW()
FROM user_info, palette_applet
ON CONFLICT DO NOTHING;

-- If the above fails due to project_id not existing, try without it:
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

-- 5. Verify the record was created with all necessary fields
SELECT
  ap.*,
  u.email,
  u.full_name,
  a.name as applet_name,
  a.type as applet_type
FROM aloa_applet_progress ap
JOIN aloa_user_profiles u ON ap.user_id = u.id::text
JOIN aloa_applets a ON ap.applet_id = a.id
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE u.email = 'internetstuff@me.com'
  AND p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%');

-- 6. Test the exact query the API uses
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

-- 7. Also check if the interaction data exists (for the palette data itself)
SELECT
  'Interaction data:' as label,
  ai.id,
  ai.applet_id,
  ai.user_email,
  ai.interaction_type,
  ai.created_at,
  jsonb_pretty(ai.data) as palette_data
FROM aloa_applet_interactions ai
WHERE ai.user_email = 'internetstuff@me.com'
  AND ai.interaction_type = 'submission'
  AND ai.applet_id IN (
    SELECT a.id
    FROM aloa_applets a
    JOIN aloa_projectlets p ON a.projectlet_id = p.id
    WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
      AND (a.type = 'palette_cleanser' OR a.name ILIKE '%palette%')
  )
ORDER BY ai.created_at DESC;