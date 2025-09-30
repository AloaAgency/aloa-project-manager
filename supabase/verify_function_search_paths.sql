-- Verify that all functions now have search_path set
-- This should return an empty result if everything is fixed

SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE
        WHEN p.proconfig IS NULL THEN 'No config'
        WHEN NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) AS config
            WHERE config LIKE 'search_path=%'
        ) THEN 'Missing search_path'
        ELSE 'Has search_path'
    END AS status,
    p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  -- Check functions that should have search_path but might not
  AND (p.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config
    WHERE config LIKE 'search_path=%'
  ))
ORDER BY p.proname;

-- If this returns 0 rows, all functions are properly configured!