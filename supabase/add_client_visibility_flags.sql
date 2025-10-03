-- Add client visibility flags to projectlets and applets

-- Projectlets: track whether clients can see the projectlet
ALTER TABLE aloa_projectlets
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT false;

-- Existing projectlets stay visible until manually hidden
UPDATE aloa_projectlets
SET client_visible = true
WHERE client_visible IS NULL;

-- Ensure future projectlets start hidden by default
ALTER TABLE aloa_projectlets
ALTER COLUMN client_visible SET DEFAULT false;

-- Applets: track whether clients can see the applet
ALTER TABLE aloa_applets
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT false;

-- Existing applets stay visible until manually hidden
UPDATE aloa_applets
SET client_visible = true
WHERE client_visible IS NULL;

-- Ensure future applets start hidden by default
ALTER TABLE aloa_applets
ALTER COLUMN client_visible SET DEFAULT false;

COMMENT ON COLUMN aloa_projectlets.client_visible IS 'Controls whether the projectlet is visible in the client dashboard.';
COMMENT ON COLUMN aloa_applets.client_visible IS 'Controls whether the applet is visible in the client dashboard.';
