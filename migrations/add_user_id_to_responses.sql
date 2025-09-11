-- Add user_id column to aloa_form_responses table if it doesn't exist
-- This allows tracking form submissions per user for multi-stakeholder forms

ALTER TABLE aloa_form_responses 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_user_id 
ON aloa_form_responses(user_id);

-- Create a composite index for form_id + user_id lookups
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_form_user 
ON aloa_form_responses(aloa_form_id, user_id);