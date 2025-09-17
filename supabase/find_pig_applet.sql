-- Find ALL applets for this project
SELECT
  a.id,
  a.name,
  a.type,
  pl.name as projectlet_name,
  a.config,
  a.config::text as raw_config
FROM aloa_applets a
JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
WHERE pl.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
ORDER BY pl.order_index, a.order_index;

-- Look for any applet with 'upload' type
SELECT
  a.id,
  a.name,
  a.type,
  pl.name as projectlet_name,
  a.config,
  jsonb_typeof(a.config->'files') as files_type
FROM aloa_applets a
JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
WHERE pl.project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  AND a.type = 'upload'
ORDER BY pl.order_index, a.order_index;