-- Rename phase_overview to aloa_phase_overview for consistency
-- Run this in Supabase SQL Editor to fix the naming
-- IMPORTANT: Creates view WITHOUT SECURITY DEFINER to respect RLS

-- Drop the old views
DROP VIEW IF EXISTS phase_overview CASCADE;
DROP VIEW IF EXISTS aloa_phase_overview CASCADE;

-- Create the new view with correct aloa_ prefix (NO SECURITY DEFINER)
CREATE VIEW aloa_phase_overview AS
SELECT
    p.*,
    COUNT(DISTINCT pl.id) as total_projectlets,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'completed') as completed_projectlets,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'in_progress') as in_progress_projectlets,
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'locked') as locked_projectlets,
    COALESCE(SUM(
        CASE
            WHEN pl.status = 'completed' THEN 100
            WHEN pl.status = 'in_progress' THEN 50
            ELSE 0
        END
    ) / NULLIF(COUNT(pl.id), 0), 0) as calculated_completion
FROM aloa_project_phases p
LEFT JOIN aloa_projectlets pl ON pl.phase_id = p.id
GROUP BY p.id;

-- Revoke default grants and apply minimal permissions (RLS-aligned)
REVOKE ALL ON aloa_phase_overview FROM PUBLIC;
REVOKE ALL ON aloa_phase_overview FROM anon;
GRANT SELECT ON aloa_phase_overview TO authenticated;
GRANT SELECT ON aloa_phase_overview TO service_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully created aloa_phase_overview WITHOUT SECURITY DEFINER';
END $$;