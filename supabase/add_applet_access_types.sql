-- Add access_type to categorize applet behavior by user role
-- INPUT: Can be filled by Client Participants and Client Admins
-- DECISION: Only accessible to Client Admins
-- ADMINISTRATIVE: Only accessible to Client Admins

-- First, create the enum type for access control
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'applet_access_type') THEN
        CREATE TYPE applet_access_type AS ENUM ('input', 'decision', 'administrative');
    END IF;
END $$;

-- Add the access_type column to the applet library
ALTER TABLE aloa_applet_library
ADD COLUMN IF NOT EXISTS access_type applet_access_type DEFAULT 'input';

-- Add the access_type column to applet instances
ALTER TABLE aloa_applets
ADD COLUMN IF NOT EXISTS access_type applet_access_type DEFAULT 'input';

-- Update existing applet types with their appropriate access types
UPDATE aloa_applet_library SET access_type =
    CASE
        -- INPUT type applets (can be filled by all client users)
        WHEN type IN ('form', 'palette_cleanser', 'tone_of_voice', 'link_submission', 'upload', 'content_gather', 'moodboard', 'feedback_loop', 'ai_form_results', 'ai_narrative_generator')
            THEN 'input'::applet_access_type

        -- DECISION type applets (only Client Admins can access)
        WHEN type IN ('client_review', 'review', 'signoff', 'sitemap', 'sitemap_builder')
            THEN 'decision'::applet_access_type

        -- Default to input for any unknown types
        ELSE 'input'::applet_access_type
    END
WHERE access_type IS NULL;

-- Update existing applet instances to inherit access_type from their library items
UPDATE aloa_applets a
SET access_type = l.access_type
FROM aloa_applet_library l
WHERE a.library_applet_id = l.id
  AND a.access_type IS NULL;

-- For applets without library references, set based on their type
UPDATE aloa_applets SET access_type =
    CASE
        -- INPUT type applets
        WHEN type IN ('form', 'palette_cleanser', 'tone_of_voice', 'link_submission', 'upload', 'content_gather', 'moodboard', 'feedback_loop', 'ai_form_results', 'ai_narrative_generator')
            THEN 'input'::applet_access_type

        -- DECISION type applets
        WHEN type IN ('client_review', 'review', 'signoff', 'sitemap', 'sitemap_builder')
            THEN 'decision'::applet_access_type

        -- Default to input
        ELSE 'input'::applet_access_type
    END
WHERE library_applet_id IS NULL AND access_type IS NULL;

-- Add comment to explain the access types
COMMENT ON COLUMN aloa_applet_library.access_type IS 'Determines which client roles can access this applet type. input: All client users, decision: Client Admins only, administrative: Client Admins only';
COMMENT ON COLUMN aloa_applets.access_type IS 'Determines which client roles can access this applet instance. input: All client users, decision: Client Admins only, administrative: Client Admins only';