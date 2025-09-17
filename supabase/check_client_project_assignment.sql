-- Check if internetstuff@me.com has a project assignment

-- First check the user profile
SELECT id, email, role, full_name
FROM aloa_user_profiles
WHERE email = 'internetstuff@me.com';

-- Check project member assignments
SELECT
  pm.*,
  ap.project_name,
  ap.status
FROM aloa_project_members pm
JOIN aloa_projects ap ON ap.id = pm.project_id
WHERE pm.user_id IN (
  SELECT id FROM aloa_user_profiles WHERE email = 'internetstuff@me.com'
);

-- If you need to assign this user to a project, use this query:
-- Get the first available project ID
SELECT id, project_name FROM aloa_projects LIMIT 1;

-- Then run this to assign the user to the project (replace PROJECT_ID with actual ID):
/*
INSERT INTO aloa_project_members (
  project_id,
  user_id,
  project_role,
  joined_at
)
SELECT
  'PROJECT_ID'::uuid,  -- Replace with actual project ID
  id,
  'viewer',
  NOW()
FROM aloa_user_profiles
WHERE email = 'internetstuff@me.com'
ON CONFLICT (project_id, user_id)
DO UPDATE SET project_role = 'viewer';
*/