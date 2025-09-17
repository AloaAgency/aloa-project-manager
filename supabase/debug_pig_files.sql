-- Debug: Check what's actually stored for the Pig applet

-- 1. Get the raw config data for Pig
SELECT
  id,
  name,
  type,
  config,
  config::text as raw_config_text,
  jsonb_typeof(config) as config_type,
  jsonb_typeof(config->'files') as files_type,
  config->'files' as files_field,
  jsonb_array_length(
    CASE
      WHEN jsonb_typeof(config->'files') = 'array' THEN config->'files'
      ELSE '[]'::jsonb
    END
  ) as files_count
FROM aloa_applets
WHERE name ILIKE '%pig%'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );

-- 2. Try to extract each file from the array
SELECT
  name,
  jsonb_array_elements(config->'files') as file
FROM aloa_applets
WHERE name ILIKE '%pig%'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  )
  AND jsonb_typeof(config->'files') = 'array';