-- ============================================
-- Security Audit: Active Triggers & Functions
-- Checks for potential security vulnerabilities
-- ============================================

-- 1. List all active triggers
SELECT
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 2. List all functions and check for security issues
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE
        WHEN prosecdef THEN 'SECURITY DEFINER ⚠️'
        ELSE 'SECURITY INVOKER ✅'
    END as security_type,
    CASE
        WHEN proconfig IS NULL THEN '❌ NO search_path set'
        WHEN array_to_string(proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path: ' || array_to_string(proconfig, ', ')
        ELSE '❌ NO search_path set'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Only functions, not aggregates
ORDER BY
    CASE WHEN prosecdef THEN 0 ELSE 1 END,  -- SECURITY DEFINER first
    CASE WHEN proconfig IS NULL THEN 0 ELSE 1 END,  -- Missing search_path first
    function_name;

-- 3. Check for functions that could be exploited
SELECT
    n.nspname as schema,
    p.proname as function_name,
    '⚠️ SECURITY DEFINER without search_path' as issue
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER
    AND (p.proconfig IS NULL OR NOT array_to_string(p.proconfig, ', ') LIKE '%search_path%');

-- 4. Check for triggers that might bypass RLS
SELECT
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE
        WHEN p.prosecdef THEN '⚠️ Trigger function is SECURITY DEFINER'
        ELSE '✅ Trigger function is SECURITY INVOKER'
    END as security_concern
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT t.tgisinternal
ORDER BY
    CASE WHEN p.prosecdef THEN 0 ELSE 1 END,  -- SECURITY DEFINER first
    table_name;
