-- Comprehensive fix for the aloa_applet_interactions table
-- This addresses both the constraint issue and the missing updated_at column

-- 1. First add the updated_at column if it doesn't exist
ALTER TABLE aloa_applet_interactions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Drop the existing constraint (if it exists)
ALTER TABLE aloa_applet_interactions
DROP CONSTRAINT IF EXISTS aloa_applet_interactions_interaction_type_check;

-- 3. Add the correct constraint with 'submission' included
ALTER TABLE aloa_applet_interactions
ADD CONSTRAINT aloa_applet_interactions_interaction_type_check
CHECK (interaction_type IN ('view', 'submission', 'approval', 'revision_request', 'skip', 'completion'));

-- 4. Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_aloa_applet_interactions_updated_at ON aloa_applet_interactions;

CREATE TRIGGER update_aloa_applet_interactions_updated_at
BEFORE UPDATE ON aloa_applet_interactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Verify the table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'aloa_applet_interactions'
ORDER BY ordinal_position;

-- 7. Verify the constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'aloa_applet_interactions'::regclass
AND conname LIKE '%interaction_type%';