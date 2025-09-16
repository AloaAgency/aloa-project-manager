-- Add folder support to aloa_project_files table
ALTER TABLE aloa_project_files
ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_folder_id UUID REFERENCES aloa_project_files(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS folder_path TEXT DEFAULT '/';

-- Add index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_parent_folder
ON aloa_project_files(parent_folder_id);

CREATE INDEX IF NOT EXISTS idx_aloa_project_files_is_folder
ON aloa_project_files(is_folder);

-- Add constraint to ensure folders don't have file data
ALTER TABLE aloa_project_files
ADD CONSTRAINT check_folder_consistency
CHECK (
  (is_folder = true AND file_size IS NULL AND file_type IS NULL AND storage_path IS NULL)
  OR
  (is_folder = false)
);