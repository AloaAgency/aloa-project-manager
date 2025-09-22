-- Fix palette cleanser records that should be completed but aren't
-- When form_progress exists with finalSelections, the applet should be marked as complete

-- First, let's check which palette cleanser records have data but incorrect status
SELECT
  ap.id,
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.completed_at,
  ap.form_progress->>'finalSelections' as final_selections,
  LENGTH(ap.form_progress->>'finalSelections') as selection_length,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser'
  AND ap.form_progress IS NOT NULL
  AND ap.status != 'completed';

-- Update any palette cleanser records that have finalSelections but aren't marked as complete
UPDATE aloa_applet_progress ap
SET
  status = 'completed',
  completed_at = COALESCE(ap.completed_at, NOW()),
  completion_percentage = 100,
  updated_at = NOW()
FROM aloa_applets a
WHERE a.id = ap.applet_id
  AND a.type = 'palette_cleanser'
  AND ap.form_progress IS NOT NULL
  AND ap.form_progress->>'finalSelections' IS NOT NULL
  AND ap.form_progress->>'finalSelections' != '[]'
  AND ap.status != 'completed';

-- Also fix the stored procedure to better handle the palette_progress vs palette_submit distinction
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
  v_actual_status TEXT;
BEGIN
  -- Check if a record already exists
  SELECT * INTO v_existing_record
  FROM aloa_applet_progress
  WHERE applet_id = p_applet_id AND user_id = p_user_id;

  -- Determine actual status to use
  -- If we're receiving 'in_progress' but the record was already completed,
  -- keep it as completed (user is just editing)
  IF v_existing_record.id IS NOT NULL AND
     v_existing_record.status IN ('completed', 'approved') AND
     p_status = 'in_progress' THEN
    v_actual_status := v_existing_record.status; -- Preserve completed status
  ELSE
    v_actual_status := p_status;
  END IF;

  IF v_existing_record.id IS NOT NULL THEN
    -- Update existing record
    UPDATE aloa_applet_progress
    SET
      status = v_actual_status,
      completion_percentage = COALESCE(p_completion_percentage,
        CASE
          WHEN v_actual_status IN ('completed', 'approved') THEN 100
          WHEN v_actual_status = 'in_progress' THEN 50
          WHEN v_actual_status = 'started' THEN 50
          ELSE 0
        END
      ),
      started_at = CASE
        -- Set started_at if it's null and we're starting work
        WHEN v_existing_record.started_at IS NULL AND v_actual_status IN ('in_progress', 'started')
        THEN NOW()
        -- Preserve existing started_at
        ELSE v_existing_record.started_at
      END,
      completed_at = CASE
        -- Always set completed_at to NOW() when marking as completed
        WHEN v_actual_status IN ('completed', 'approved') AND v_existing_record.completed_at IS NULL THEN NOW()
        -- Keep existing completed_at if already completed
        WHEN v_actual_status IN ('completed', 'approved') THEN v_existing_record.completed_at
        -- Clear completed_at only if explicitly going back to not started
        WHEN v_actual_status = 'not_started' THEN NULL
        -- Otherwise preserve existing value
        ELSE v_existing_record.completed_at
      END,
      last_accessed_at = NOW(),
      form_progress = COALESCE(p_form_progress, v_existing_record.form_progress),
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
          WHEN p_status IN ('completed', 'approved') THEN 100
          WHEN p_status IN ('in_progress', 'started') THEN 50
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
      p_form_progress,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_progress;
  END IF;

  -- Log for debugging
  RAISE NOTICE 'Updated applet progress - applet_id: %, user_id: %, received_status: %, actual_status: %, completed_at: %',
    p_applet_id, p_user_id, p_status, v_actual_status, v_progress.completed_at;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_applet_progress TO authenticated;
GRANT EXECUTE ON FUNCTION update_applet_progress TO anon;

-- Finally, check if the fix worked
SELECT
  ap.id,
  ap.applet_id,
  ap.user_id,
  ap.status,
  ap.completed_at,
  a.name,
  a.type
FROM aloa_applet_progress ap
JOIN aloa_applets a ON a.id = ap.applet_id
WHERE a.type = 'palette_cleanser';