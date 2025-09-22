-- Fix all applet progress saving issues
-- This comprehensive fix ensures all applet types properly track progress and completion

-- Drop and recreate the update_applet_progress function with proper handling
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
  -- Check if a record already exists
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
          WHEN p_status = 'approved' THEN 100
          WHEN p_status = 'in_progress' THEN 50
          WHEN p_status = 'started' THEN 50
          ELSE 0
        END
      ),
      started_at = CASE
        -- Set started_at if it's null and we're starting work
        WHEN v_existing_record.started_at IS NULL AND p_status IN ('in_progress', 'started')
        THEN NOW()
        -- Preserve existing started_at
        ELSE v_existing_record.started_at
      END,
      completed_at = CASE
        -- Always set completed_at to NOW() when marking as completed
        WHEN p_status IN ('completed', 'approved') THEN NOW()
        -- Clear completed_at when going back to in_progress (user is editing)
        WHEN p_status IN ('in_progress', 'started') THEN NULL
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
          WHEN p_status = 'completed' THEN 100
          WHEN p_status = 'approved' THEN 100
          WHEN p_status = 'in_progress' THEN 50
          WHEN p_status = 'started' THEN 50
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
  RAISE NOTICE 'Updated applet progress - applet_id: %, user_id: %, status: %, completed_at: %',
    p_applet_id, p_user_id, p_status, v_progress.completed_at;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Add a helper function to check applet completion status
CREATE OR REPLACE FUNCTION is_applet_completed(
  p_applet_id UUID,
  p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  SELECT
    CASE
      WHEN status IN ('completed', 'approved') AND completed_at IS NOT NULL THEN true
      ELSE false
    END INTO v_completed
  FROM aloa_applet_progress
  WHERE applet_id = p_applet_id
    AND user_id = p_user_id;

  -- If no record exists, it's not completed
  IF v_completed IS NULL THEN
    v_completed := false;
  END IF;

  RETURN v_completed;
END;
$$ LANGUAGE plpgsql;

-- Fix any existing records that have completion status but no completed_at timestamp
UPDATE aloa_applet_progress
SET
  completed_at = COALESCE(completed_at, updated_at, NOW()),
  updated_at = NOW()
WHERE status IN ('completed', 'approved')
  AND completed_at IS NULL;

-- Fix any existing records that are marked as in_progress but have a completed_at timestamp
UPDATE aloa_applet_progress
SET
  completed_at = NULL,
  updated_at = NOW()
WHERE status IN ('in_progress', 'started')
  AND completed_at IS NOT NULL;

-- Add logging trigger for debugging (can be removed later)
CREATE OR REPLACE FUNCTION log_applet_progress_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE NOTICE 'Applet progress changed - applet_id: %, user_id: %, old_status: %, new_status: %, old_completed: %, new_completed: %',
      NEW.applet_id, NEW.user_id, OLD.status, NEW.status, OLD.completed_at, NEW.completed_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS applet_progress_change_log ON aloa_applet_progress;
CREATE TRIGGER applet_progress_change_log
  AFTER UPDATE ON aloa_applet_progress
  FOR EACH ROW
  EXECUTE FUNCTION log_applet_progress_changes();

-- Grant necessary permissions
GRANT ALL ON aloa_applet_progress TO authenticated;
GRANT ALL ON aloa_applet_progress TO anon;
GRANT EXECUTE ON FUNCTION update_applet_progress TO authenticated;
GRANT EXECUTE ON FUNCTION update_applet_progress TO anon;
GRANT EXECUTE ON FUNCTION is_applet_completed TO authenticated;
GRANT EXECUTE ON FUNCTION is_applet_completed TO anon;