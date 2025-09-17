-- Add structured metadata fields to aloa_projects
-- This migration adds project_type and scope details to the metadata field

-- Update the metadata field with default structure for existing projects
UPDATE aloa_projects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{project_type}',
  '"Website Design"'::jsonb
)
WHERE metadata IS NULL OR metadata->>'project_type' IS NULL;

-- Add scope information to metadata
UPDATE aloa_projects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{scope}',
  '{
    "main_pages": 5,
    "aux_pages": 5,
    "description": "Standard website package"
  }'::jsonb
)
WHERE metadata IS NULL OR metadata->>'scope' IS NULL;

-- Add additional project details structure
UPDATE aloa_projects
SET metadata = metadata || '{
  "editable_fields": {
    "project_type": "Website Design",
    "scope": {
      "main_pages": 5,
      "aux_pages": 5,
      "description": "Standard website package"
    },
    "budget_details": {
      "design": 0,
      "development": 0,
      "content": 0,
      "other": 0
    },
    "timeline_notes": "",
    "special_requirements": "",
    "target_audience": "",
    "brand_guidelines": "",
    "competitors": []
  }
}'::jsonb
WHERE metadata->>'editable_fields' IS NULL;

-- Create a function to ensure project metadata structure
CREATE OR REPLACE FUNCTION ensure_project_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure metadata has required structure
  IF NEW.metadata IS NULL THEN
    NEW.metadata = '{}'::jsonb;
  END IF;

  -- Ensure project_type exists
  IF NEW.metadata->>'project_type' IS NULL THEN
    NEW.metadata = jsonb_set(NEW.metadata, '{project_type}', '"Website Design"'::jsonb);
  END IF;

  -- Ensure scope exists
  IF NEW.metadata->>'scope' IS NULL THEN
    NEW.metadata = jsonb_set(NEW.metadata, '{scope}', '{
      "main_pages": 5,
      "aux_pages": 5,
      "description": "Standard website package"
    }'::jsonb);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure metadata structure on insert/update
DROP TRIGGER IF EXISTS ensure_project_metadata_trigger ON aloa_projects;
CREATE TRIGGER ensure_project_metadata_trigger
BEFORE INSERT OR UPDATE ON aloa_projects
FOR EACH ROW
EXECUTE FUNCTION ensure_project_metadata();

-- Add indexes for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_aloa_projects_metadata_project_type
ON aloa_projects ((metadata->>'project_type'));

CREATE INDEX IF NOT EXISTS idx_aloa_projects_metadata_scope
ON aloa_projects ((metadata->'scope'));