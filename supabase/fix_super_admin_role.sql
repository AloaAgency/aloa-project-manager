-- Check current super_admin users and their roles
SELECT id, email, role, created_at
FROM aloa_user_profiles
WHERE role = 'super_admin' OR email IN (
    -- Add your super admin email here if known
    SELECT email FROM auth.users WHERE email LIKE '%@%'
)
ORDER BY created_at DESC;

-- Update a specific user to super_admin (replace the email)
-- Uncomment and modify the line below with the correct email:
-- UPDATE aloa_user_profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';

-- Verify the role enum includes super_admin
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- If super_admin is missing from the enum, add it:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Check if there are any auth.users without profiles
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN aloa_user_profiles aup ON au.id = aup.id OR au.email = aup.email
WHERE aup.id IS NULL;

-- Create missing profiles for auth users (as super_admin for now)
-- Uncomment to create profiles for users without them:
/*
INSERT INTO aloa_user_profiles (id, email, full_name, role, created_at, updated_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
    'super_admin' as role,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN aloa_user_profiles aup ON au.id = aup.id OR au.email = aup.email
WHERE aup.id IS NULL;
*/