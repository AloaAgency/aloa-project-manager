-- Add read column to aloa_applet_interactions table for notification tracking
ALTER TABLE aloa_applet_interactions
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Update existing records to be marked as read (optional, can be false if you want them unread)
UPDATE aloa_applet_interactions SET read = FALSE WHERE read IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_aloa_applet_interactions_read
ON aloa_applet_interactions(project_id, read);

-- Return the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'aloa_applet_interactions'
ORDER BY ordinal_position;