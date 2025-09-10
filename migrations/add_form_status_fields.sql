-- Add form status fields to support closing/reopening forms
-- Run this in your Supabase SQL editor

-- Add is_active field to forms table (defaults to true for all existing forms)
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add closed_message field to store custom message when form is closed
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS closed_message TEXT;

-- Update all existing forms to be active (if you haven't already)
UPDATE forms 
SET is_active = true 
WHERE is_active IS NULL;

-- Optional: Add an index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);