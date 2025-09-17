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

-- Check specifically for Test Jenkins
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
  AND user_email IN ('test@jenkins.com', 'testjenkins@example.com', 'jenkins@test.com')
ORDER BY created_at DESC;

-- Check what email Test Jenkins is using in completions
SELECT DISTINCT
  aap.user_id,
  aup.email,
  aup.full_name
FROM aloa_applet_progress aap
JOIN aloa_user_profiles aup ON aap.user_id = aup.id
WHERE aap.applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND aap.status = 'completed';