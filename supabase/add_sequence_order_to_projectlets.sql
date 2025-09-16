-- Add sequence_order column to aloa_projectlets table for drag-and-drop reordering
ALTER TABLE aloa_projectlets
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- Update existing projectlets to have sequential order based on created_at
WITH ordered_projectlets AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as new_order
  FROM aloa_projectlets
)
UPDATE aloa_projectlets
SET sequence_order = ordered_projectlets.new_order
FROM ordered_projectlets
WHERE aloa_projectlets.id = ordered_projectlets.id;

-- Add an index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_projectlets_sequence_order
ON aloa_projectlets(project_id, sequence_order);