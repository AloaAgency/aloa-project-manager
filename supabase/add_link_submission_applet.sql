-- Add link submission applet to the applet library
-- This applet allows admins to submit multiple links with descriptions for client review

-- First, check if the link_submission applet already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM aloa_applet_library 
    WHERE type = 'link_submission'
  ) THEN
    INSERT INTO aloa_applet_library (
      name,
      description,
      type,
      icon,
      config_schema,
      default_config,
      is_active,
      usage_count
    ) VALUES (
      'Link Submission',
      'Share deliverables and resources with clients through organized link collections',
      'link_submission',
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
    );
  END IF;
END $$;

-- Add column to track link submission acknowledgments if it doesn't exist
ALTER TABLE aloa_applets 
ADD COLUMN IF NOT EXISTS client_acknowledgment JSONB DEFAULT '{}'::jsonb;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_aloa_applets_client_acknowledgment 
ON aloa_applets USING gin(client_acknowledgment);

COMMENT ON COLUMN aloa_applets.client_acknowledgment IS 'Stores client acknowledgment data for link submissions and other review-type applets';