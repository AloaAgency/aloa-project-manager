-- Check the structure of aloa_project_members table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'aloa_project_members'
ORDER BY ordinal_position;

-- Check existing data in aloa_project_members
SELECT * FROM aloa_project_members
WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a';

-- Check all project members (first 10)
SELECT
  pm.*,
  up.email,
  up.full_name,
  up.role as user_role
FROM aloa_project_members pm
LEFT JOIN aloa_user_profiles up ON pm.user_id = up.id
LIMIT 10;

-- Add created_at column if it doesn't exist
ALTER TABLE aloa_project_members
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have a created_at value if NULL
UPDATE aloa_project_members
SET created_at = NOW()
WHERE created_at IS NULL;