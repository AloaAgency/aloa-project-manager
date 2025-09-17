-- Fix palette cleanser interaction types
-- This updates existing palette_selection interactions to submission type
-- so they can be properly fetched by the applet-completions API

-- First, let's check what palette interactions exist
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  created_at,
  data->>'completedAt' as completed_at
FROM aloa_applet_interactions
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND interaction_type IN ('palette_selection', 'submission')
ORDER BY created_at DESC;

-- Update palette_selection to submission for completed palette cleansers
UPDATE aloa_applet_interactions
SET interaction_type = 'submission'
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND interaction_type = 'palette_selection'
  AND data->>'completedAt' IS NOT NULL;

-- Verify the update
SELECT
  id,
  applet_id,
  user_email,
  interaction_type,
  created_at,
  jsonb_pretty(data) as data
FROM aloa_applet_interactions
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND interaction_type = 'submission'
ORDER BY created_at DESC;