-- Step 1: Find YOUR user in auth.users and check if you have a profile
-- This will show all users and their profile status
SELECT
    au.id as auth_id,
    au.email,
    au.created_at as auth_created,
    aup.id as profile_id,
    aup.role as current_role,
    aup.full_name,
    CASE
        WHEN aup.id IS NULL THEN 'NO PROFILE - NEEDS CREATION'
        WHEN aup.role != 'super_admin' THEN 'HAS PROFILE - NEEDS ROLE UPDATE'
        ELSE 'OK - IS SUPER ADMIN'
    END as status
FROM auth.users au
LEFT JOIN aloa_user_profiles aup ON (au.id = aup.id OR au.email = aup.email)
ORDER BY au.created_at DESC;

-- Step 2: After finding your email in the results above, run ONE of these:

-- Option A: If you have NO PROFILE (profile_id is null), create one:
/*
INSERT INTO aloa_user_profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
    'YOUR_AUTH_ID_HERE',  -- Replace with your auth_id from step 1
    'your.email@example.com',  -- Replace with your email
    'Your Name',  -- Replace with your name
    'super_admin',
    NOW(),
    NOW()
);
*/

-- Option B: If you HAVE A PROFILE but wrong role, update it:
/*
UPDATE aloa_user_profiles
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'your.email@example.com';  -- Replace with your email
*/

-- Step 3: Verify the fix worked
/*
SELECT id, email, full_name, role, created_at, updated_at
FROM aloa_user_profiles
WHERE email = 'your.email@example.com';  -- Replace with your email
*/

-- TROUBLESHOOTING: If you still can't access after updating:
-- 1. Log out completely (clear cookies)
-- 2. Log back in
-- 3. Try accessing /legacy-dashboard or /admin/forms again

-- To see all super_admins in the system:
SELECT id, email, full_name, role, created_at
FROM aloa_user_profiles
WHERE role = 'super_admin'
ORDER BY created_at DESC;