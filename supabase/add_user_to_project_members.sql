-- Add user as a project member to enable chat functionality
-- Replace the placeholders with actual values:
-- - YOUR_USER_ID: The ID of the user you want to add
-- - YOUR_PROJECT_ID: The ID of the project

-- First, check existing project members
SELECT
    pm.*,
    up.full_name,
    up.email,
    up.role as user_role
FROM aloa_project_members pm
JOIN aloa_user_profiles up ON up.id = pm.user_id
WHERE pm.project_id = 'YOUR_PROJECT_ID';

-- Add a user as a project member
-- Roles can be: 'admin', 'member', 'viewer'
INSERT INTO aloa_project_members (
    user_id,
    project_id,
    project_role,
    joined_at,
    created_at,
    updated_at
) VALUES (
    'YOUR_USER_ID',  -- Replace with actual user ID
    'YOUR_PROJECT_ID',  -- Replace with actual project ID
    'admin',  -- or 'member' or 'viewer'
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (user_id, project_id)
DO UPDATE SET
    project_role = EXCLUDED.project_role,
    updated_at = NOW();

-- Verify the user was added
SELECT
    pm.*,
    up.full_name,
    up.email,
    up.role as user_role
FROM aloa_project_members pm
JOIN aloa_user_profiles up ON up.id = pm.user_id
WHERE pm.project_id = 'YOUR_PROJECT_ID';

-- To find your user ID, run:
SELECT id, email, full_name, role
FROM aloa_user_profiles
WHERE email = 'your-email@example.com';

-- To find project IDs, run:
SELECT id, name, client_name, status
FROM aloa_projects
ORDER BY created_at DESC;