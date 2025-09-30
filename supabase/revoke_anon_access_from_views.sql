-- Revoke anonymous access from all aloa views
-- This fixes the Supabase linter warnings about "Security Definer View"
-- The linter flags views with anon access as security risks

-- Revoke anon access from all views
REVOKE ALL ON aloa_weighted_responses FROM anon;
REVOKE ALL ON aloa_applet_with_user_progress FROM anon;
REVOKE ALL ON aloa_forms_with_stats FROM anon;
REVOKE ALL ON aloa_phase_overview FROM anon;

-- Also revoke from PUBLIC to be extra safe
REVOKE ALL ON aloa_weighted_responses FROM PUBLIC;
REVOKE ALL ON aloa_applet_with_user_progress FROM PUBLIC;
REVOKE ALL ON aloa_forms_with_stats FROM PUBLIC;
REVOKE ALL ON aloa_phase_overview FROM PUBLIC;

-- Ensure only authenticated users and service_role have access
GRANT SELECT ON aloa_weighted_responses TO authenticated;
GRANT SELECT ON aloa_weighted_responses TO service_role;

GRANT SELECT ON aloa_applet_with_user_progress TO authenticated;
GRANT SELECT ON aloa_applet_with_user_progress TO service_role;

GRANT SELECT ON aloa_forms_with_stats TO authenticated;
GRANT SELECT ON aloa_forms_with_user_progress TO service_role;

GRANT SELECT ON aloa_phase_overview TO authenticated;
GRANT SELECT ON aloa_phase_overview TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Successfully revoked anonymous access from all views';
END $$;