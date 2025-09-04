-- Add notification_email field to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS notification_email TEXT DEFAULT 'ross@aloa.agency';