SELECT
    tablename,
    policyname,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'aloa_applet_completions',
    'aloa_applet_interactions',
    'aloa_applet_progress',
    'aloa_client_feedback',
    'aloa_client_notifications',
    'aloa_form_responses',
    'aloa_prototypes',
    'project_files'
)
ORDER BY tablename, policyname;
