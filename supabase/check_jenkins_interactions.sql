-- Check for any interactions from Test Jenkins using the correct email
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  created_at,
  jsonb_pretty(data) as data
FROM aloa_applet_interactions
WHERE user_email = 'internetstuff@me.com'
ORDER BY created_at DESC;

-- Check specifically for palette cleanser interactions
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  created_at,
  data->>'completedAt' as completed_at,
  data->>'finalSelections' as final_selections,
  data->>'backgroundPreference' as background_pref
FROM aloa_applet_interactions
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND user_email = 'internetstuff@me.com'
ORDER BY created_at DESC;

-- Check if Test Jenkins has a completion record
SELECT
  *
FROM aloa_applet_progress
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND user_id = 'f2f59869-d1e9-4cb3-b371-3f7ec6c01aca';