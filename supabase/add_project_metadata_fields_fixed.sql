-- Add metadata column if it doesn't exist
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Also add a rules column for backward compatibility with existing code that uses project.rules
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}';

-- Update existing projects to have default metadata structure
UPDATE aloa_projects
SET metadata = jsonb_build_object(
  'project_type', COALESCE(metadata->>'project_type', 'Website Design'),
  'scope', jsonb_build_object(
    'main_pages', COALESCE((metadata->'scope'->>'main_pages')::int, (rules->>'main_pages')::int, 5),
    'aux_pages', COALESCE((metadata->'scope'->>'aux_pages')::int, (rules->>'aux_pages')::int, 5),
    'description', COALESCE(metadata->'scope'->>'description', 'Standard website package')
  ),
  'editable_fields', COALESCE(metadata->'editable_fields', jsonb_build_object(
    'budget_details', jsonb_build_object(
      'design', 0,
      'development', 0,
      'content', 0,
      'other', 0
    ),
    'timeline_notes', '',
    'special_requirements', '',
    'target_audience', '',
    'brand_guidelines', '',
    'competitors', '[]'::jsonb
  ))
)
WHERE metadata IS NULL OR metadata = '{}' OR metadata->>'project_type' IS NULL;

-- Also populate rules for backward compatibility
UPDATE aloa_projects
SET rules = jsonb_build_object(
  'main_pages', COALESCE((metadata->'scope'->>'main_pages')::int, (rules->>'main_pages')::int, 5),
  'aux_pages', COALESCE((metadata->'scope'->>'aux_pages')::int, (rules->>'aux_pages')::int, 5)
)
WHERE rules IS NULL OR rules = '{}';

-- Create a function to ensure project metadata structure
CREATE OR REPLACE FUNCTION ensure_project_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure metadata exists
  IF NEW.metadata IS NULL THEN
    NEW.metadata = '{}'::jsonb;
  END IF;

  -- Ensure project_type exists
  IF NEW.metadata->>'project_type' IS NULL THEN
    NEW.metadata = jsonb_set(NEW.metadata, '{project_type}', '"Website Design"'::jsonb);
  END IF;

  -- Ensure scope exists with default values
  IF NEW.metadata->>'scope' IS NULL THEN
    NEW.metadata = jsonb_set(NEW.metadata, '{scope}', jsonb_build_object(
      'main_pages', 5,
      'aux_pages', 5,
      'description', 'Standard website package'
    ));
  END IF;

  -- Sync rules for backward compatibility
  NEW.rules = jsonb_build_object(
    'main_pages', COALESCE((NEW.metadata->'scope'->>'main_pages')::int, 5),
    'aux_pages', COALESCE((NEW.metadata->'scope'->>'aux_pages')::int, 5)
  );

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