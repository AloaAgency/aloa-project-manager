-- Check if knowledge fields exist and have data
SELECT
  id,
  project_name,
  existing_url,
  google_drive_url,
  base_knowledge,
  knowledge_updated_at
FROM aloa_projects
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';