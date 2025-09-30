-- Check if views have SECURITY DEFINER property set
-- This checks the actual pg_catalog metadata, not just the view definition

SELECT
    c.relname AS view_name,
    CASE
        WHEN c.relkind = 'v' THEN 'view'
        ELSE c.relkind::text
    END AS object_type,
    -- Check reloptions for security_barrier and other options
    c.reloptions,
    -- Get the owner
    pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN (
    'aloa_weighted_responses',
    'aloa_applet_with_user_progress',
    'aloa_forms_with_stats',
    'aloa_phase_overview',
    'phase_overview'
)
ORDER BY c.relname;

-- Also check if there are any rules with SECURITY DEFINER
SELECT
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules
WHERE schemaname = 'public'
AND tablename IN (
    'aloa_weighted_responses',
    'aloa_applet_with_user_progress',
    'aloa_forms_with_stats',
    'aloa_phase_overview',
    'phase_overview'
);