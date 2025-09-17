-- Add project_id column to aloa_applet_interactions table if it doesn't exist
ALTER TABLE aloa_applet_interactions
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE;

-- Update existing records to get project_id from their applet
UPDATE aloa_applet_interactions ai
SET project_id = (
    SELECT pl.project_id
    FROM aloa_applets a
    JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
    WHERE a.id = ai.applet_id
)
WHERE project_id IS NULL;

-- Make project_id NOT NULL after updating existing records
-- Run this separately after confirming all records have project_id
-- ALTER TABLE aloa_applet_interactions ALTER COLUMN project_id SET NOT NULL;