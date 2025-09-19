-- Fix the palette cleanser completion issue once and for all
-- The issue: completed_at is not being set when status = 'completed'

-- First check current data
SELECT
  ap.id,
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.completed_at,
  ap.started_at,
  ap.completion_percentage,
  a.name
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser'
ORDER BY ap.updated_at DESC;

-- Drop and recreate the function with better handling
DROP FUNCTION IF EXISTS update_applet_progress CASCADE;

CREATE OR REPLACE FUNCTION update_applet_progress(
  p_applet_id UUID,
  p_user_id TEXT,
  p_project_id UUID,
  p_status TEXT,
  p_completion_percentage INTEGER DEFAULT NULL,
  p_form_progress JSONB DEFAULT NULL
)
RETURNS aloa_applet_progress AS $$
DECLARE
  v_progress aloa_applet_progress;
  v_existing_record aloa_applet_progress;
BEGIN
  -- Check if record exists
  SELECT * INTO v_existing_record
  FROM aloa_applet_progress
  WHERE applet_id = p_applet_id AND user_id = p_user_id;

  IF v_existing_record.id IS NOT NULL THEN
    -- Update existing record
    UPDATE aloa_applet_progress
    SET
      status = p_status,
      completion_percentage = COALESCE(p_completion_percentage,
        CASE
          WHEN p_status = 'completed' THEN 100
          WHEN p_status = 'in_progress' THEN 50
          ELSE completion_percentage
        END
      ),
      started_at = CASE
        WHEN started_at IS NULL AND p_status IN ('in_progress', 'started')
        THEN NOW()
        ELSE started_at
      END,
      completed_at = CASE
        WHEN p_status = 'completed' THEN NOW()  -- Always update completed_at when marked completed
        WHEN p_status = 'in_progress' THEN NULL
        ELSE completed_at
      END,
      last_accessed_at = NOW(),
      form_progress = COALESCE(p_form_progress, form_progress),
      updated_at = NOW()
    WHERE applet_id = p_applet_id AND user_id = p_user_id
    RETURNING * INTO v_progress;
  ELSE
    -- Insert new record
    INSERT INTO aloa_applet_progress (
      applet_id,
      user_id,
      project_id,
      status,
      completion_percentage,
      started_at,
      completed_at,
      last_accessed_at,
      form_progress,
      created_at,
      updated_at
    ) VALUES (
      p_applet_id,
      p_user_id,
      p_project_id,
      p_status,
      COALESCE(p_completion_percentage,
        CASE
          WHEN p_status = 'completed' THEN 100
          WHEN p_status = 'in_progress' THEN 50
          ELSE 0
        END
      ),
      CASE
        WHEN p_status IN ('in_progress', 'started') THEN NOW()
        ELSE NULL
      END,
      CASE
        WHEN p_status = 'completed' THEN NOW()
        ELSE NULL
      END,
      NOW(),
      p_form_progress,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_progress;
  END IF;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_applet_progress TO authenticated;
GRANT EXECUTE ON FUNCTION update_applet_progress TO anon;
GRANT EXECUTE ON FUNCTION update_applet_progress TO service_role;

-- Manually fix any existing palette cleanser records that should be completed
-- This will set completed_at for any palette cleanser with status='completed' but no completed_at
UPDATE aloa_applet_progress ap
SET
  completed_at = COALESCE(ap.completed_at, NOW()),
  updated_at = NOW()
FROM aloa_applets a
WHERE
  ap.applet_id = a.id
  AND a.type = 'palette_cleanser'
  AND ap.status = 'completed'
  AND ap.completed_at IS NULL;

-- Verify the fix
SELECT
  ap.id,
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.completed_at,
  ap.completion_percentage,
  a.name
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser'
ORDER BY ap.updated_at DESC;