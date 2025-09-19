-- Check the current state of the update_applet_progress function
-- and ensure it properly handles palette_cleanser completion

-- First, let's check if there are any existing progress records
SELECT
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.completed_at,
  ap.form_progress,
  a.name as applet_name,
  a.type as applet_type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser'
ORDER BY ap.updated_at DESC
LIMIT 10;

-- Update the function to ensure palette_cleanser completions are properly saved
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
BEGIN
  -- Log the input for debugging
  RAISE NOTICE 'update_applet_progress called: applet=%, user=%, status=%, completion=%',
    p_applet_id, p_user_id, p_status, p_completion_percentage;

  INSERT INTO aloa_applet_progress (
    applet_id,
    user_id,
    project_id,
    status,
    completion_percentage,
    started_at,
    completed_at,
    last_accessed_at,
    form_progress
  ) VALUES (
    p_applet_id,
    p_user_id,
    p_project_id,
    p_status,
    COALESCE(p_completion_percentage,
      CASE
        WHEN p_status IN ('completed', 'approved') THEN 100
        WHEN p_status = 'in_progress' THEN 50
        ELSE 0
      END
    ),
    CASE
      WHEN p_status IN ('in_progress', 'started') THEN NOW()
      ELSE NULL
    END,
    CASE
      WHEN p_status IN ('completed', 'approved') THEN NOW()
      ELSE NULL
    END,
    NOW(),
    p_form_progress
  )
  ON CONFLICT (applet_id, user_id)
  DO UPDATE SET
    status = p_status,
    completion_percentage = COALESCE(p_completion_percentage,
      CASE
        WHEN p_status IN ('completed', 'approved') THEN 100
        WHEN p_status = 'in_progress' THEN 50
        ELSE aloa_applet_progress.completion_percentage
      END
    ),
    started_at = CASE
      WHEN aloa_applet_progress.started_at IS NULL AND p_status IN ('in_progress', 'started')
      THEN NOW()
      ELSE aloa_applet_progress.started_at
    END,
    completed_at = CASE
      WHEN p_status IN ('completed', 'approved') THEN NOW()
      WHEN p_status = 'in_progress' THEN NULL  -- Clear completed_at when going back to in_progress
      ELSE aloa_applet_progress.completed_at
    END,
    last_accessed_at = NOW(),
    form_progress = COALESCE(p_form_progress, aloa_applet_progress.form_progress),
    updated_at = NOW()
  RETURNING * INTO v_progress;

  -- Log the result for debugging
  RAISE NOTICE 'Progress updated: id=%, status=%, completed_at=%',
    v_progress.id, v_progress.status, v_progress.completed_at;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_applet_progress TO authenticated;
GRANT EXECUTE ON FUNCTION update_applet_progress TO anon;
GRANT EXECUTE ON FUNCTION update_applet_progress TO service_role;

-- Test query to verify palette cleanser progress after running this
SELECT
  ap.*,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser'
ORDER BY ap.updated_at DESC;