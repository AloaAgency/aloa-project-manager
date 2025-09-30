-- File: /supabase/security_fix_14_fix_views.sql
-- Purpose: Recreate key analytical views without SECURITY DEFINER
--          and align privileges with RLS.

-- aloa_weighted_responses
DROP VIEW IF EXISTS aloa_weighted_responses CASCADE;
CREATE VIEW aloa_weighted_responses AS
SELECT
  fr.id,
  fr.aloa_form_id,
  fr.aloa_project_id,
  fr.responses,
  fr.submitted_at,
  fr.user_id,
  fr.stakeholder_id,
  fr.stakeholder_importance,
  s.role AS stakeholder_role,
  p.full_name AS stakeholder_name,
  p.email AS stakeholder_email,
  proj.project_name AS project_name
FROM aloa_form_responses fr
LEFT JOIN aloa_project_stakeholders s ON fr.stakeholder_id = s.id
LEFT JOIN aloa_user_profiles p ON (
  fr.user_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND fr.user_id::uuid = p.id
)
LEFT JOIN aloa_projects proj ON fr.aloa_project_id = proj.id
ORDER BY fr.stakeholder_importance DESC NULLS LAST, fr.submitted_at DESC;

REVOKE ALL ON aloa_weighted_responses FROM PUBLIC;
REVOKE ALL ON aloa_weighted_responses FROM anon;
GRANT SELECT ON aloa_weighted_responses TO authenticated;
GRANT SELECT ON aloa_weighted_responses TO service_role;

-- aloa_applet_with_user_progress
DROP VIEW IF EXISTS aloa_applet_with_user_progress CASCADE;
CREATE VIEW aloa_applet_with_user_progress AS
SELECT
  a.id,
  a.projectlet_id,
  a.library_applet_id,
  a.name,
  a.description,
  a.type,
  a.order_index,
  a.config,
  a.form_id,
  a.status,
  a.completion_percentage,
  a.requires_approval,
  a.created_at,
  a.updated_at,
  ap.user_id,
  COALESCE(ap.status, 'not_started') AS user_status,
  COALESCE(ap.completion_percentage, 0) AS user_completion_percentage,
  ap.started_at AS user_started_at,
  ap.completed_at AS user_completed_at,
  ap.form_progress AS user_form_progress
FROM aloa_applets a
LEFT JOIN aloa_applet_progress ap ON ap.applet_id = a.id;

REVOKE ALL ON aloa_applet_with_user_progress FROM PUBLIC;
REVOKE ALL ON aloa_applet_with_user_progress FROM anon;
GRANT SELECT ON aloa_applet_with_user_progress TO authenticated;
GRANT SELECT ON aloa_applet_with_user_progress TO service_role;

-- aloa_forms_with_stats
DROP VIEW IF EXISTS aloa_forms_with_stats CASCADE;
CREATE VIEW aloa_forms_with_stats AS
SELECT
  f.id,
  f.title,
  f.description,
  f.url_id,
  f.markdown_content,
  f.aloa_project_id,
  f.status,
  f.sections,
  f.settings,
  f.theme,
  f.is_template,
  f.template_category,
  f.view_count,
  f.submission_count,
  f.created_at,
  f.updated_at,
  COUNT(DISTINCT r.id) AS total_responses,
  COUNT(DISTINCT ff.id) AS total_fields,
  MAX(r.submitted_at) AS last_submission
FROM aloa_forms f
LEFT JOIN aloa_form_responses r ON r.aloa_form_id = f.id
LEFT JOIN aloa_form_fields ff ON ff.aloa_form_id = f.id
GROUP BY f.id;

REVOKE ALL ON aloa_forms_with_stats FROM PUBLIC;
REVOKE ALL ON aloa_forms_with_stats FROM anon;
GRANT SELECT ON aloa_forms_with_stats TO authenticated;
GRANT SELECT ON aloa_forms_with_stats TO service_role;

-- aloa_phase_overview (renamed from phase_overview for consistency)
DROP VIEW IF EXISTS phase_overview CASCADE;
DROP VIEW IF EXISTS aloa_phase_overview CASCADE;
CREATE VIEW aloa_phase_overview AS
SELECT
  p.*,
  COUNT(DISTINCT pl.id) AS total_projectlets,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'completed') AS completed_projectlets,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'in_progress') AS in_progress_projectlets,
  COUNT(DISTINCT pl.id) FILTER (WHERE pl.status = 'locked') AS locked_projectlets,
  COALESCE(SUM(
    CASE
      WHEN pl.status = 'completed' THEN 100
      WHEN pl.status = 'in_progress' THEN 50
      ELSE 0
    END
  ) / NULLIF(COUNT(pl.id), 0), 0) AS calculated_completion
FROM aloa_project_phases p
LEFT JOIN aloa_projectlets pl ON pl.phase_id = p.id
GROUP BY p.id;

REVOKE ALL ON aloa_phase_overview FROM PUBLIC;
REVOKE ALL ON aloa_phase_overview FROM anon;
GRANT SELECT ON aloa_phase_overview TO authenticated;
GRANT SELECT ON aloa_phase_overview TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Analytical views recreated without SECURITY DEFINER.';
END $$;
