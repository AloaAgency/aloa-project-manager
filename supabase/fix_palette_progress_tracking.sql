-- Fix Test Jenkins' palette cleanser progress to show as in-progress
-- This updates the record to have started_at set but completed_at cleared

UPDATE aloa_applet_progress
SET
  status = 'in_progress',
  started_at = COALESCE(started_at, NOW()),
  completed_at = NULL,
  completion_percentage = 50,
  updated_at = NOW()
WHERE user_id = 'internetstuff@me.com'
  AND applet_id IN (
    SELECT id FROM aloa_applets
    WHERE type = 'palette_cleanser'
    AND projectlet_id IN (
      SELECT id FROM aloa_projectlets
      WHERE project_id = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'
    )
  );

-- Update the stored procedure to handle the case where a user is editing after completion
-- This ensures started_at is preserved but completed_at is cleared when going back to in_progress
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
    COALESCE(p_completion_percentage, CASE WHEN p_status = 'completed' THEN 100 ELSE 50 END),
    CASE WHEN p_status IN ('in_progress', 'started') THEN NOW() ELSE NULL END,
    CASE WHEN p_status IN ('completed', 'approved') THEN NOW() ELSE NULL END,
    NOW(),
    p_form_progress
  )
  ON CONFLICT (applet_id, user_id)
  DO UPDATE SET
    status = p_status,
    completion_percentage = COALESCE(p_completion_percentage,
      CASE
        WHEN p_status = 'completed' THEN 100
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

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;