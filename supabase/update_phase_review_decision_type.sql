-- Update phase_review applet to be a DECISION type applet
-- Only client_admin users can see and interact with this applet

-- Update the applet library item to set access_type to 'decision'
UPDATE aloa_applet_library
SET
    access_type = 'decision'::applet_access_type,
    client_instructions = 'This major milestone review requires approval from decision-makers. Only client administrators can submit reviews for this phase.',
    updated_at = NOW()
WHERE type = 'phase_review';

-- Also update any existing phase_review applet instances
UPDATE aloa_applets
SET access_type = 'decision'::applet_access_type
WHERE type = 'phase_review';