-- Complete migration for link submission applet
-- Run this entire script in one go

-- Step 1: Add link_submission to the applet_type enum
ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'link_submission';

-- Step 2: Add column for client acknowledgments if it doesn't exist
ALTER TABLE aloa_applets 
ADD COLUMN IF NOT EXISTS client_acknowledgment JSONB DEFAULT '{}'::jsonb;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_aloa_applets_client_acknowledgment 
ON aloa_applets USING gin(client_acknowledgment);

-- Step 4: Add comment
COMMENT ON COLUMN aloa_applets.client_acknowledgment IS 'Stores client acknowledgment data for link submissions and other review-type applets';

-- Step 5: Insert the link submission applet into the library
-- We do this in a separate transaction to ensure the enum value is available
INSERT INTO aloa_applet_library (
  name,
  description,
  type,
  icon,
  config_schema,
  default_config,
  is_active,
  usage_count
) 
SELECT 
  'Link Submission',
  'Share deliverables and resources with clients through organized link collections',
  'link_submission'::applet_type,
  'Link',
  jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'heading', jsonb_build_object(
        'type', 'string',
        'description', 'Main heading/context for the links'
      ),
      'description', jsonb_build_object(
        'type', 'string', 
        'description', 'Additional context or instructions'
      ),
      'links', jsonb_build_object(
        'type', 'array',
        'items', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'text', jsonb_build_object(
              'type', 'string',
              'description', 'Display text for the link'
            ),
            'url', jsonb_build_object(
              'type', 'string',
              'description', 'The URL to link to'
            ),
            'description', jsonb_build_object(
              'type', 'string',
              'description', 'Optional description for this link'
            )
          ),
          'required', jsonb_build_array('text', 'url')
        )
      ),
      'allow_client_acknowledgment', jsonb_build_object(
        'type', 'boolean',
        'description', 'Allow clients to mark as reviewed'
      )
    ),
    'required', jsonb_build_array('heading', 'links')
  ),
  jsonb_build_object(
    'heading', 'Project Deliverables',
    'description', 'Please review the following materials:',
    'links', jsonb_build_array(
      jsonb_build_object(
        'text', 'View Design Mockups',
        'url', 'https://example.com',
        'description', 'Latest design iterations'
      )
    ),
    'allow_client_acknowledgment', true
  ),
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM aloa_applet_library 
  WHERE type = 'link_submission'::applet_type
);

-- Step 6: Verify the applet was added
SELECT name, type, description 
FROM aloa_applet_library 
WHERE type = 'link_submission'::applet_type;