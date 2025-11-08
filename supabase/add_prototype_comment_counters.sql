-- Add comment counter columns to aloa_prototypes table
-- These columns track comment statistics for each prototype

-- Add columns if they don't exist
ALTER TABLE aloa_prototypes
  ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_comments INTEGER DEFAULT 0;

-- Create function to update comment counters
CREATE OR REPLACE FUNCTION update_prototype_comment_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Update counters for the affected prototype
  UPDATE aloa_prototypes
  SET
    total_comments = (
      SELECT COUNT(*)
      FROM aloa_prototype_comments
      WHERE prototype_id = COALESCE(NEW.prototype_id, OLD.prototype_id)
        AND is_deleted = false
    ),
    open_comments = (
      SELECT COUNT(*)
      FROM aloa_prototype_comments
      WHERE prototype_id = COALESCE(NEW.prototype_id, OLD.prototype_id)
        AND status = 'open'
        AND is_deleted = false
    ),
    resolved_comments = (
      SELECT COUNT(*)
      FROM aloa_prototype_comments
      WHERE prototype_id = COALESCE(NEW.prototype_id, OLD.prototype_id)
        AND status = 'resolved'
        AND is_deleted = false
    )
  WHERE id = COALESCE(NEW.prototype_id, OLD.prototype_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update counters on INSERT/UPDATE/DELETE
DROP TRIGGER IF EXISTS trigger_update_prototype_comment_counters ON aloa_prototype_comments;
CREATE TRIGGER trigger_update_prototype_comment_counters
  AFTER INSERT OR UPDATE OR DELETE ON aloa_prototype_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_prototype_comment_counters();

-- Initialize counters for existing prototypes
UPDATE aloa_prototypes p
SET
  total_comments = (
    SELECT COUNT(*)
    FROM aloa_prototype_comments c
    WHERE c.prototype_id = p.id
      AND c.is_deleted = false
  ),
  open_comments = (
    SELECT COUNT(*)
    FROM aloa_prototype_comments c
    WHERE c.prototype_id = p.id
      AND c.status = 'open'
      AND c.is_deleted = false
  ),
  resolved_comments = (
    SELECT COUNT(*)
    FROM aloa_prototype_comments c
    WHERE c.prototype_id = p.id
      AND c.status = 'resolved'
      AND c.is_deleted = false
  );

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'aloa_prototypes'
  AND column_name IN ('total_comments', 'open_comments', 'resolved_comments')
ORDER BY column_name;
