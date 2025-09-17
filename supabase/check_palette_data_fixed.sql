-- Check all interactions for the palette cleanser applet
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  created_at,
  jsonb_pretty(data) as data
FROM aloa_applet_interactions
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
ORDER BY created_at DESC;

-- Check specifically for Test Jenkins by various possible emails
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  created_at,
  data->>'completedAt' as completed_at,
  data->>'finalSelections' as final_selections,
  data->>'paletteRatings' as palette_ratings
FROM aloa_applet_interactions
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND (
    user_email LIKE '%jenkins%'
    OR user_email LIKE '%test%'
  )
ORDER BY created_at DESC;

-- Check what users have completed the palette cleanser
SELECT DISTINCT
  aap.user_id,
  aap.status,
  aap.completion_percentage,
  aap.completed_at
FROM aloa_applet_progress aap
WHERE aap.applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND aap.status = 'completed';

-- Also check the user profiles table separately
SELECT
  id,
  email,
  full_name
FROM aloa_user_profiles
WHERE full_name LIKE '%Jenkins%' OR email LIKE '%jenkins%';