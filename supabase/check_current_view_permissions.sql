-- Check current permissions on all problematic views
SELECT
    schemaname,
    tablename AS view_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE schemaname = 'public'
AND tablename IN (
    'aloa_weighted_responses',
    'aloa_applet_with_user_progress',
    'aloa_forms_with_stats',
    'aloa_phase_overview'
)
ORDER BY tablename, grantee, privilege_type;