-- Add client_references field to aloa_projects table
-- This field stores an array of client reference sites for inspiration

ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS client_references JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the field
COMMENT ON COLUMN aloa_projects.client_references IS 'Array of client reference sites with name and URL for design inspiration';

-- Example of the expected data structure:
-- [
--   {"name": "Apple", "url": "https://apple.com"},
--   {"name": "Stripe", "url": "https://stripe.com"}
-- ]