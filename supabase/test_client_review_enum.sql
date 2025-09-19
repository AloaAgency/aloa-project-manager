-- Simple test to verify client_review enum exists
-- Run this in Supabase SQL editor

-- 1. Show all current enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'applet_type'::regtype
ORDER BY enumlabel;

-- 2. Check if client_review is in the list
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumtypid = 'applet_type'::regtype
            AND enumlabel = 'client_review'
        )
        THEN 'client_review EXISTS in enum ✅'
        ELSE 'client_review MISSING from enum ❌ - Need to run add_client_review_applet_type.sql'
    END as status;

-- 3. Check if it's in the library
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM aloa_applet_library
            WHERE type = 'client_review'
        )
        THEN 'Client Review EXISTS in library ✅'
        ELSE 'Client Review MISSING from library ❌ - Need to run add_client_review_library_item.sql'
    END as library_status;