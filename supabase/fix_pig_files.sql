-- Check what's actually in the Pig applet config
SELECT
  id,
  name,
  type,
  config,
  config::text as raw_config
FROM aloa_applets
WHERE name = 'Pig'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );

-- Update Pig applet to add example files (similar to what was shown in earlier CSV)
UPDATE aloa_applets
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{files}',
  '[
    {
      "id": "1",
      "name": "Project_Brief.pdf",
      "size": 2456789,
      "type": "application/pdf",
      "uploaded_at": "2024-01-15T10:30:00Z",
      "url": "https://example.com/files/project_brief.pdf"
    },
    {
      "id": "2",
      "name": "Brand_Guidelines.pdf",
      "size": 3567890,
      "type": "application/pdf",
      "uploaded_at": "2024-01-15T10:31:00Z",
      "url": "https://example.com/files/brand_guidelines.pdf"
    },
    {
      "id": "3",
      "name": "Design_Mockups.zip",
      "size": 15678901,
      "type": "application/zip",
      "uploaded_at": "2024-01-15T10:32:00Z",
      "url": "https://example.com/files/design_mockups.zip"
    }
  ]'::jsonb
)
WHERE name = 'Pig'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  )
RETURNING id, name, config;

-- Verify the update
SELECT
  id,
  name,
  config->'files' as files,
  jsonb_array_length(config->'files') as file_count
FROM aloa_applets
WHERE name = 'Pig'
  AND projectlet_id IN (
    SELECT id FROM aloa_projectlets
    WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
  );