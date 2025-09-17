-- Fix the interaction_type check constraint for aloa_applet_interactions table
-- This adds 'submission' to the allowed values if it's missing

-- First, drop the existing constraint if it exists
ALTER TABLE aloa_applet_interactions
DROP CONSTRAINT IF EXISTS aloa_applet_interactions_interaction_type_check;

-- Add the constraint with all allowed values including 'submission'
ALTER TABLE aloa_applet_interactions
ADD CONSTRAINT aloa_applet_interactions_interaction_type_check
CHECK (interaction_type IN ('view', 'submission', 'approval', 'revision_request', 'skip', 'completion'));

-- Verify the fix
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'aloa_applet_interactions'::regclass
AND conname LIKE '%interaction_type%';