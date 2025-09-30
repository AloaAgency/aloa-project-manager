-- Check the 4 SECURITY DEFINER functions for search_path issues
SELECT
    p.proname as function_name,
    CASE
        WHEN p.prosecdef THEN 'SECURITY DEFINER ⚠️'
        ELSE 'SECURITY INVOKER ✅'
    END as security_type,
    CASE
        WHEN p.proconfig IS NULL THEN '❌ NO search_path set - VULNERABLE'
        WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path: ' || array_to_string(p.proconfig, ', ')
        ELSE '❌ NO search_path set - VULNERABLE'
    END as search_path_status,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'extract_knowledge_from_form_response',
        'update_form_submission_count',
        'extract_knowledge_from_form'
    )
ORDER BY p.proname;
