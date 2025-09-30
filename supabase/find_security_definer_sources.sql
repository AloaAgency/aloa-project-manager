-- Find all SECURITY DEFINER functions that might be masquerading as views
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    CASE
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN (
    'aloa_weighted_responses',
    'aloa_applet_with_user_progress',
    'aloa_forms_with_stats',
    'aloa_phase_overview',
    'phase_overview'
)
ORDER BY p.proname;