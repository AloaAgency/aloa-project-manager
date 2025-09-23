-- Add stakeholder importance scoring system
-- This allows weighting responses based on organizational hierarchy
-- (e.g., CEO responses weighted higher than assistant responses)

-- =====================================================
-- 1. Add importance_score to stakeholders table
-- =====================================================

-- Add importance score to stakeholders (1-10 scale)
ALTER TABLE aloa_project_stakeholders
ADD COLUMN IF NOT EXISTS importance_score INTEGER DEFAULT 5
  CHECK (importance_score >= 1 AND importance_score <= 10);

-- Add comment for documentation
COMMENT ON COLUMN aloa_project_stakeholders.importance_score IS
  'Importance weight 1-10: How much this stakeholder''s input should influence decisions (10=highest priority like CEO, 1=lowest priority)';

-- =====================================================
-- 2. Add importance_score to form responses
-- =====================================================

-- Add stakeholder importance to form responses
ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS stakeholder_importance INTEGER DEFAULT 5
  CHECK (stakeholder_importance >= 1 AND stakeholder_importance <= 10),
ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES aloa_project_stakeholders(id);

-- Add user_id if not exists (for tracking who submitted)
ALTER TABLE aloa_form_responses
ADD COLUMN IF NOT EXISTS user_id TEXT;

COMMENT ON COLUMN aloa_form_responses.stakeholder_importance IS
  'Importance score of the stakeholder who submitted this response (copied from stakeholder table at submission time)';

-- =====================================================
-- 3. Add importance_score to applet interactions
-- =====================================================

-- Add stakeholder importance to applet interactions
ALTER TABLE aloa_applet_interactions
ADD COLUMN IF NOT EXISTS stakeholder_importance INTEGER DEFAULT 5
  CHECK (stakeholder_importance >= 1 AND stakeholder_importance <= 10),
ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES aloa_project_stakeholders(id);

COMMENT ON COLUMN aloa_applet_interactions.stakeholder_importance IS
  'Importance score of the stakeholder who performed this interaction';

-- =====================================================
-- 4. Add importance_score to applet progress
-- =====================================================

-- Add stakeholder importance to applet progress tracking
ALTER TABLE aloa_applet_progress
ADD COLUMN IF NOT EXISTS stakeholder_importance INTEGER DEFAULT 5
  CHECK (stakeholder_importance >= 1 AND stakeholder_importance <= 10),
ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES aloa_project_stakeholders(id);

COMMENT ON COLUMN aloa_applet_progress.stakeholder_importance IS
  'Importance score of the stakeholder whose progress is being tracked';

-- =====================================================
-- 5. Create function to get stakeholder importance
-- =====================================================

-- Function to get stakeholder importance score
CREATE OR REPLACE FUNCTION get_stakeholder_importance(
  p_user_id UUID,
  p_project_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_importance INTEGER;
BEGIN
  -- Get importance score from stakeholders table
  SELECT importance_score INTO v_importance
  FROM aloa_project_stakeholders
  WHERE user_id = p_user_id
    AND project_id = p_project_id
  LIMIT 1;

  -- Return importance or default to 5 if not found
  RETURN COALESCE(v_importance, 5);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Create trigger to auto-populate importance scores
-- =====================================================

-- Function to automatically set stakeholder importance on insert
CREATE OR REPLACE FUNCTION set_stakeholder_importance()
RETURNS TRIGGER AS $$
DECLARE
  v_importance INTEGER;
  v_stakeholder_id UUID;
BEGIN
  -- Skip if importance already set
  IF NEW.stakeholder_importance IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try to get stakeholder info based on user_id and project_id
  IF NEW.user_id IS NOT NULL THEN
    -- For form responses (user_id is TEXT, needs conversion)
    IF TG_TABLE_NAME = 'aloa_form_responses' AND NEW.aloa_project_id IS NOT NULL THEN
      IF NEW.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        SELECT id, importance_score
        INTO v_stakeholder_id, v_importance
        FROM aloa_project_stakeholders
        WHERE user_id = NEW.user_id::UUID
          AND project_id = NEW.aloa_project_id
        LIMIT 1;
      END IF;
    -- For applet interactions
    ELSIF TG_TABLE_NAME = 'aloa_applet_interactions' AND NEW.project_id IS NOT NULL THEN
      SELECT id, importance_score
      INTO v_stakeholder_id, v_importance
      FROM aloa_project_stakeholders
      WHERE user_id = NEW.user_id
        AND project_id = NEW.project_id
      LIMIT 1;
    -- For applet progress
    ELSIF TG_TABLE_NAME = 'aloa_applet_progress' AND NEW.project_id IS NOT NULL THEN
      -- Note: user_id is TEXT in this table, so we need to handle differently
      IF NEW.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        SELECT id, importance_score
        INTO v_stakeholder_id, v_importance
        FROM aloa_project_stakeholders
        WHERE user_id = NEW.user_id::UUID
          AND project_id = NEW.project_id
        LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- Set the importance and stakeholder_id
  NEW.stakeholder_importance := COALESCE(v_importance, 5);
  IF v_stakeholder_id IS NOT NULL THEN
    NEW.stakeholder_id := v_stakeholder_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS set_form_response_importance ON aloa_form_responses;
CREATE TRIGGER set_form_response_importance
  BEFORE INSERT ON aloa_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION set_stakeholder_importance();

DROP TRIGGER IF EXISTS set_interaction_importance ON aloa_applet_interactions;
CREATE TRIGGER set_interaction_importance
  BEFORE INSERT ON aloa_applet_interactions
  FOR EACH ROW
  EXECUTE FUNCTION set_stakeholder_importance();

DROP TRIGGER IF EXISTS set_progress_importance ON aloa_applet_progress;
CREATE TRIGGER set_progress_importance
  BEFORE INSERT ON aloa_applet_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_stakeholder_importance();

-- =====================================================
-- 7. Create weighted aggregation functions for AI
-- =====================================================

-- Function to calculate weighted average for numeric values
CREATE OR REPLACE FUNCTION weighted_average(
  value_array NUMERIC[],
  weight_array INTEGER[]
) RETURNS NUMERIC AS $$
DECLARE
  total_weighted_sum NUMERIC := 0;
  total_weight INTEGER := 0;
  i INTEGER;
BEGIN
  IF array_length(value_array, 1) != array_length(weight_array, 1) THEN
    RAISE EXCEPTION 'Values and weights arrays must be same length';
  END IF;

  FOR i IN 1..array_length(value_array, 1) LOOP
    total_weighted_sum := total_weighted_sum + (value_array[i] * weight_array[i]);
    total_weight := total_weight + weight_array[i];
  END LOOP;

  IF total_weight = 0 THEN
    RETURN NULL;
  END IF;

  RETURN total_weighted_sum / total_weight;
END;
$$ LANGUAGE plpgsql;

-- Function to get weighted consensus from text responses
CREATE OR REPLACE FUNCTION get_weighted_consensus(
  p_project_id UUID,
  p_field_name TEXT DEFAULT NULL
) RETURNS TABLE (
  response_value TEXT,
  total_weight INTEGER,
  weighted_percentage NUMERIC,
  respondent_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH weighted_responses AS (
    SELECT
      CASE
        WHEN p_field_name IS NOT NULL
        THEN responses->p_field_name::TEXT
        ELSE responses::TEXT
      END as value,
      stakeholder_importance as weight
    FROM aloa_form_responses
    WHERE aloa_project_id = p_project_id
      AND responses IS NOT NULL
  ),
  aggregated AS (
    SELECT
      value,
      SUM(weight) as total_weight,
      COUNT(*) as respondent_count
    FROM weighted_responses
    WHERE value IS NOT NULL
    GROUP BY value
  ),
  total AS (
    SELECT SUM(total_weight) as sum_weight
    FROM aggregated
  )
  SELECT
    a.value as response_value,
    a.total_weight::INTEGER,
    ROUND((a.total_weight::NUMERIC / t.sum_weight::NUMERIC * 100), 2) as weighted_percentage,
    a.respondent_count::INTEGER
  FROM aggregated a
  CROSS JOIN total t
  ORDER BY a.total_weight DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Create view for weighted responses analysis
-- =====================================================

CREATE OR REPLACE VIEW aloa_weighted_responses AS
SELECT
  fr.id,
  fr.aloa_form_id,
  fr.aloa_project_id,
  fr.responses,
  fr.submitted_at,
  fr.user_id,
  fr.stakeholder_id,
  fr.stakeholder_importance,
  s.role as stakeholder_role,
  p.full_name as stakeholder_name,
  p.email as stakeholder_email,
  proj.name as project_name
FROM aloa_form_responses fr
LEFT JOIN aloa_project_stakeholders s ON fr.stakeholder_id = s.id
LEFT JOIN aloa_user_profiles p ON
  CASE
    WHEN fr.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN fr.user_id::uuid = p.id
    ELSE false
  END
LEFT JOIN aloa_projects proj ON fr.aloa_project_id = proj.id
ORDER BY fr.stakeholder_importance DESC, fr.submitted_at DESC;

-- Grant permissions
GRANT SELECT ON aloa_weighted_responses TO authenticated;
GRANT SELECT ON aloa_weighted_responses TO anon;

-- =====================================================
-- 9. Update existing stakeholder records with default importance
-- =====================================================

-- Set default importance scores based on role
UPDATE aloa_project_stakeholders
SET importance_score = CASE
  -- You can adjust these defaults based on your needs
  WHEN role = 'client' THEN 7  -- Main client contact
  WHEN role = 'stakeholder' THEN 5  -- Regular stakeholder
  WHEN role = 'viewer' THEN 3  -- View-only participant
  ELSE 5  -- Default
END
WHERE importance_score IS NULL;

-- =====================================================
-- 10. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_form_responses_importance
  ON aloa_form_responses(stakeholder_importance);
CREATE INDEX IF NOT EXISTS idx_form_responses_stakeholder
  ON aloa_form_responses(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_interactions_importance
  ON aloa_applet_interactions(stakeholder_importance);
CREATE INDEX IF NOT EXISTS idx_progress_importance
  ON aloa_applet_progress(stakeholder_importance);

-- =====================================================
-- Example Usage:
-- =====================================================

-- Set a stakeholder's importance score:
-- UPDATE aloa_project_stakeholders
-- SET importance_score = 10
-- WHERE user_id = 'user-uuid' AND project_id = 'project-uuid';

-- Get weighted consensus for a form field:
-- SELECT * FROM get_weighted_consensus('project-uuid', 'preferred_colors');

-- Calculate weighted average for numeric responses:
-- SELECT weighted_average(
--   ARRAY[8, 6, 9]::NUMERIC[],
--   ARRAY[10, 2, 5]::INTEGER[]
-- ); -- Returns weighted average based on importance