-- Check user profile for ross@aloa.agency
SELECT id, email, role, created_at, updated_at 
FROM aloa_user_profiles 
WHERE email = 'ross@aloa.agency';

-- Also check if there are multiple profiles
SELECT COUNT(*) as profile_count, email, array_agg(role) as roles
FROM aloa_user_profiles 
WHERE email = 'ross@aloa.agency'
GROUP BY email;