-- Ensure applets are scoped directly to their parent project
-- Adds project_id column and backfills existing rows

ALTER TABLE aloa_applets
  ADD COLUMN IF NOT EXISTS project_id UUID;

-- Backfill project_id from related projectlet
WITH updated AS (
  SELECT a.id, p.project_id
  FROM aloa_applets a
  JOIN aloa_projectlets p ON p.id = a.projectlet_id
  WHERE a.project_id IS DISTINCT FROM p.project_id
)
UPDATE aloa_applets a
SET project_id = u.project_id
FROM updated u
WHERE a.id = u.id;

-- Enforce referential integrity
ALTER TABLE aloa_applets
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE aloa_applets
  DROP CONSTRAINT IF EXISTS aloa_applets_project_id_fkey;

ALTER TABLE aloa_applets
  ADD CONSTRAINT aloa_applets_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES aloa_projects(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_aloa_applets_project
  ON aloa_applets(project_id);

COMMENT ON COLUMN aloa_applets.project_id IS 'Parent project for the applet, denormalized from aloa_projectlets.';
