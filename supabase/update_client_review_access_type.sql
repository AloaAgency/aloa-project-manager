-- Update Client Review applet to be a decision-type applet
-- This ensures only client_admin users can see and interact with it
-- client_participant users will not be able to see this applet at all

-- First update the library item
UPDATE aloa_applet_library
SET access_type = 'decision'::applet_access_type
WHERE type = 'client_review';

-- Then update any existing instances
UPDATE aloa_applets
SET access_type = 'decision'::applet_access_type
WHERE type = 'client_review';

-- Verify the update
SELECT
    type,
    name,
    access_type,
    category,
    description
FROM aloa_applet_library
WHERE type = 'client_review';

-- Check existing applet instances
SELECT
    a.id,
    a.type,
    a.name,
    a.access_type,
    p.name as project_name
FROM aloa_applets a
LEFT JOIN aloa_projectlets pl ON a.projectlet_id = pl.id
LEFT JOIN aloa_projects p ON pl.project_id = p.id
WHERE a.type = 'client_review';