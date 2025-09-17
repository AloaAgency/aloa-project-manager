-- First, let's check what palette cleanser applet we have for Test Jenkins
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND a.type = 'palette_cleanser';

-- Update Test Jenkins' palette cleanser to be in-progress (started but not completed)
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

-- Verify the update
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON ap.applet_id = a.id
WHERE ap.user_id = 'internetstuff@me.com'
  AND a.type = 'palette_cleanser';

-- Check if Pig applet has files in its config
SELECT
  id,
  name,
  type,
  config,
  config->'files' as files
FROM aloa_applets
WHERE name LIKE '%Pig%'
  OR name LIKE '%pig%'
  OR (type = 'file_upload' OR type = 'upload')
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );