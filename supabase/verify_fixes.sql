-- VERIFY BOTH FIXES ARE IN PLACE

-- 1. Check Palette Cleanser state for Test Jenkins
SELECT
  ap.applet_id,
  a.name as applet_name,
  a.type,
  ap.user_id,
  ap.status,
  ap.started_at,
  ap.completed_at,
  CASE
    WHEN ap.started_at IS NOT NULL AND ap.completed_at IS NULL THEN 'Should show Resume'
    WHEN ap.completed_at IS NOT NULL THEN 'Should show View or Edit'
    ELSE 'Should show Start'
  END as expected_button
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND a.type = 'palette_cleanser';

-- 2. Check Pig applet files configuration
SELECT
  id,
  name,
  type,
  jsonb_pretty(config) as formatted_config,
  jsonb_array_length(config->'files') as file_count
FROM aloa_applets
WHERE name ILIKE '%pig%'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );

-- 3. Verify all applet progress for Test Jenkins
SELECT
  a.name,
  a.type,
  ap.status,
  ap.started_at,
  ap.completed_at,
  CASE
    WHEN ap.started_at IS NOT NULL AND ap.completed_at IS NULL THEN 'In Progress'
    WHEN ap.completed_at IS NOT NULL THEN 'Completed'
    ELSE 'Not Started'
  END as progress_state
FROM aloa_applets a
LEFT JOIN aloa_applet_progress ap ON a.id = ap.applet_id AND ap.user_id = 'internetstuff@me.com'
WHERE a.projectlet_id IN (
  SELECT id FROM aloa_projectlets
  WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
)
ORDER BY a.order_index;