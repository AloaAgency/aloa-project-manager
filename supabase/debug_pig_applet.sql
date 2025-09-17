-- Find the Pig applet and check its files
SELECT
  a.id,
  a.name,
  a.type,
  a.config,
  jsonb_array_length(COALESCE(a.config->'files', '[]'::jsonb)) as files_in_config
FROM aloa_applets a
JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE p.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND (a.name ILIKE '%pig%' OR a.type = 'upload')
ORDER BY a.name;

-- Check files in aloa_project_files for these applets
SELECT
  pf.id,
  pf.applet_id,
  pf.file_name,
  pf.file_size,
  pf.url,
  pf.storage_type,
  a.name as applet_name
FROM aloa_project_files pf
JOIN aloa_applets a ON pf.applet_id = a.id
WHERE pf.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
ORDER BY pf.created_at DESC;

-- If Pig applet has files in config, we need to migrate them
-- First, let's see what's in the config
SELECT
  id,
  name,
  config->'files' as files
FROM aloa_applets
WHERE name ILIKE '%pig%'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );