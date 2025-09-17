-- Create test palette data for Test Jenkins
-- This simulates what should have been saved when they completed the palette cleanser

INSERT INTO aloa_applet_interactions (
  applet_id,
  project_id,
  user_email,
  user_role,
  interaction_type,
  data,
  created_at
) VALUES (
  '913c4c26-8444-4c11-93be-b7373b429f94',
  '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a',
  'internetstuff@me.com',
  'client',
  'submission',
  jsonb_build_object(
    'backgroundPreference', 'dark',
    'finalSelections', jsonb_build_array(
      jsonb_build_object(
        'id', 'cool',
        'colors', jsonb_build_array('#4ECDC4', '#556270', '#6BB6D6', '#95E1D3', '#3D5A80'),
        'mood', 'Cool & Calm',
        'category', 'temperature'
      ),
      jsonb_build_object(
        'id', 'corporate',
        'colors', jsonb_build_array('#1E3A8A', '#1E40AF', '#3B82F6', '#93C5FD', '#DBEAFE'),
        'mood', 'Corporate Professional',
        'category', 'style'
      ),
      jsonb_build_object(
        'id', 'ocean',
        'colors', jsonb_build_array('#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8'),
        'mood', 'Ocean Depths',
        'category', 'nature'
      )
    ),
    'paletteRatings', jsonb_build_object(
      'warm', 'dislike',
      'cool', 'love',
      'neutral', 'like',
      'vibrant', 'dislike',
      'muted', 'like',
      'pastel', 'dislike',
      'corporate', 'love',
      'creative', 'dislike',
      'minimal', 'like',
      'forest', 'like',
      'ocean', 'love',
      'sunset', 'dislike',
      'earth', 'like',
      'jewel', 'dislike',
      'neon', 'dislike',
      'classic', 'like',
      'blue-mono', 'love',
      'green-mono', 'like',
      'purple-mono', 'dislike',
      'modern-tech', 'love',
      'warm-elegant', 'dislike',
      'fresh-natural', 'like',
      'bold-confident', 'dislike'
    ),
    'noneSelected', false,
    'preferences', jsonb_build_object(
      'prefersDark', true,
      'prefersWarm', false,
      'prefersCool', true,
      'prefersVibrant', false,
      'prefersPastel', false,
      'prefersMinimal', false,
      'prefersCorporate', true,
      'prefersCreative', false
    ),
    'insights', jsonb_build_array(
      'Cool, calming tones resonate with your professional vision.',
      'Professional and trustworthy colors align with your brand vision.',
      'You have a clear vision and strong color preferences.'
    ),
    'notes', 'I prefer professional blues and cool tones that convey trust and stability. The ocean palette really speaks to our brand vision.',
    'completedAt', '2025-09-16T23:09:07.557Z'
  ),
  '2025-09-16 23:09:07.557145+00'
) ON CONFLICT DO NOTHING;

-- Verify the data was inserted
SELECT
  id,
  user_email,
  interaction_type,
  jsonb_pretty(data) as data
FROM aloa_applet_interactions
WHERE applet_id = '913c4c26-8444-4c11-93be-b7373b429f94'
  AND user_email = 'internetstuff@me.com'
  AND interaction_type = 'submission'
ORDER BY created_at DESC
LIMIT 1;