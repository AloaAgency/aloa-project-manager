-- Debug applet progress data
-- Check if any data exists in aloa_applet_progress table

-- 1. Count all records
SELECT COUNT(*) as total_progress_records FROM aloa_applet_progress;

-- 2. Show sample of progress records
SELECT
  ap.*,
  a.name as applet_name,
  a.type as applet_type,
  up.full_name,
  up.email
FROM aloa_applet_progress ap
LEFT JOIN aloa_applets a ON ap.applet_id = a.id
LEFT JOIN aloa_user_profiles up ON
  CASE
    WHEN ap.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ap.user_id::uuid = up.id
    ELSE FALSE
  END
ORDER BY ap.created_at DESC
LIMIT 10;

-- 3. Check completed applets specifically
SELECT
  ap.applet_id,
  a.name as applet_name,
  COUNT(*) as completion_count,
  array_agg(COALESCE(up.email, ap.user_id)) as completed_by
FROM aloa_applet_progress ap
LEFT JOIN aloa_applets a ON ap.applet_id = a.id
LEFT JOIN aloa_user_profiles up ON
  CASE
    WHEN ap.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ap.user_id::uuid = up.id
    ELSE FALSE
  END
WHERE ap.status = 'completed'
GROUP BY ap.applet_id, a.name;

-- 4. Check project members for a sample project
SELECT
  pm.*,
  up.email,
  up.full_name,
  up.role as user_role
FROM aloa_project_members pm
LEFT JOIN aloa_user_profiles up ON pm.user_id = up.id
WHERE pm.project_id IN (
  SELECT DISTINCT project_id FROM aloa_applets LIMIT 1
);

-- 5. Check if there's a mismatch between old and new completion tables
SELECT COUNT(*) as old_completions FROM aloa_applet_completions;
SELECT COUNT(*) as new_progress FROM aloa_applet_progress;