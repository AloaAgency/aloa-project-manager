-- Fix both issues: palette cleanser "Resume" button and Pig file visibility

-- First, let's check what palette cleanser applet we have for Test Jenkins
SELECT
  ap.*,
  a.name,
  a.type,
  a.config
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND a.type = 'palette_cleanser';

-- Update Test Jenkins' palette cleanser to be in-progress (started but not completed)
-- This should make it show "Resume →" instead of "Start →"
UPDATE aloa_applet_progress
SET
  status = 'in_progress',
  started_at = CASE
    WHEN started_at IS NULL THEN NOW() - INTERVAL '1 hour'
    ELSE started_at
  END,
  completed_at = NULL,  -- Clear completed_at to show as in-progress
  completion_percentage = 50,
  updated_at = NOW()
WHERE user_id = 'internetstuff@me.com'
  AND applet_id IN (
    SELECT id FROM aloa_applets
    WHERE type = 'palette_cleanser'
    AND projectlet_id IN (
      SELECT id FROM aloa_projectlets
      WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    )
  );

-- Verify the palette cleanser update
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND a.type = 'palette_cleanser';

-- Now let's check all upload applets to find the Pig one
SELECT
  id,
  name,
  type,
  config,
  jsonb_pretty(config) as pretty_config
FROM aloa_applets
WHERE type = 'upload'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );

-- Check if the config field has files
SELECT
  id,
  name,
  type,
  config->'files' as files,
  jsonb_array_length(config->'files') as file_count
FROM aloa_applets
WHERE type = 'upload'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  )
  AND config ? 'files';

-- If the Pig applet doesn't have files in config, let's check the aloa_project_files table
SELECT
  pf.id,
  pf.applet_id,
  pf.file_name,
  pf.file_type,
  pf.file_size,
  pf.url,
  pf.category,
  pf.storage_type,
  a.name as applet_name,
  a.config
FROM aloa_project_files pf
JOIN aloa_applets a ON pf.applet_id = a.id
WHERE pf.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.name LIKE '%Pig%' OR a.name LIKE '%pig%' OR pf.applet_id IN (
    SELECT id FROM aloa_applets
    WHERE type = 'upload'
    AND projectlet_id IN (
      SELECT id FROM aloa_projectlets
      WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    )
  ));

-- Let's also check which applets exist for this project
SELECT
  a.id,
  a.name,
  a.type,
  pl.name as projectlet_name,
  jsonb_array_length(a.config->'files') as file_count_in_config
FROM aloa_applets a
JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
WHERE pl.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
ORDER BY pl.order_index, a.order_index;