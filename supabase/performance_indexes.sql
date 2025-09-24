-- Performance Indexes for Aloa Web Design Project Manager
-- These indexes improve query performance for frequently accessed data patterns
-- All indexes use IF NOT EXISTS to prevent errors on re-run

-- Phase 1.3: Database Query Optimization
-- Priority: HIGH | Impact: HIGH | Risk: LOW

-- Index for filtering projects by status (dashboard views)
CREATE INDEX IF NOT EXISTS idx_aloa_projects_status
  ON aloa_projects(status);

-- Composite index for projectlet ordering within projects
CREATE INDEX IF NOT EXISTS idx_aloa_projectlets_project_order
  ON aloa_projectlets(project_id, order_index);

-- Composite index for user applet progress lookups
CREATE INDEX IF NOT EXISTS idx_aloa_applet_progress_user_applet
  ON aloa_applet_progress(user_id, applet_id);

-- Composite index for project knowledge queries by category
CREATE INDEX IF NOT EXISTS idx_aloa_project_knowledge_project
  ON aloa_project_knowledge(project_id, category);

-- Additional high-impact indexes based on common query patterns

-- Index for finding project members by user
CREATE INDEX IF NOT EXISTS idx_aloa_project_members_user_id
  ON aloa_project_members(user_id);

-- Index for finding project members by project
CREATE INDEX IF NOT EXISTS idx_aloa_project_members_project_id
  ON aloa_project_members(project_id);

-- Composite index for finding specific user's role in a project
CREATE INDEX IF NOT EXISTS idx_aloa_project_members_user_project
  ON aloa_project_members(user_id, project_id);

-- Index for timeline events by project (chronological queries)
CREATE INDEX IF NOT EXISTS idx_aloa_project_timeline_project_created
  ON aloa_project_timeline(project_id, created_at DESC);

-- Index for active notifications (skip if status column doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_notification_queue'
    AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_aloa_notification_queue_status
      ON aloa_notification_queue(status)
      WHERE status = 'pending';
  END IF;
END $$;

-- Index for project files by project
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_project
  ON aloa_project_files(project_id);

-- Index for form responses (check column existence first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_project_responses'
    AND column_name = 'project_form_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_aloa_project_responses_form
      ON aloa_project_responses(project_form_id);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_project_responses'
    AND column_name = 'form_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_aloa_project_responses_form
      ON aloa_project_responses(form_id);
  END IF;
END $$;

-- Index for knowledge extraction queue processing (check column existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aloa_knowledge_extraction_queue'
    AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_aloa_knowledge_extraction_queue_status
      ON aloa_knowledge_extraction_queue(status, created_at)
      WHERE status IN ('pending', 'processing');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_knowledge_extraction_queue'
  ) THEN
    -- Table exists but might have different structure
    CREATE INDEX IF NOT EXISTS idx_aloa_knowledge_extraction_queue_created
      ON aloa_knowledge_extraction_queue(created_at);
  END IF;
END $$;

-- Index for finding current/valid knowledge items
CREATE INDEX IF NOT EXISTS idx_aloa_project_knowledge_current
  ON aloa_project_knowledge(project_id, is_current)
  WHERE is_current = true;

-- Index for user profiles by email (login lookups)
CREATE INDEX IF NOT EXISTS idx_aloa_user_profiles_email
  ON aloa_user_profiles(email);

-- Index for applet library active items by category
CREATE INDEX IF NOT EXISTS idx_aloa_applet_library_active
  ON aloa_applet_library(is_active, category)
  WHERE is_active = true;

-- Analyze tables to update statistics after index creation
-- This helps the query planner make better decisions
ANALYZE aloa_projects;
ANALYZE aloa_projectlets;
ANALYZE aloa_applet_progress;
ANALYZE aloa_project_knowledge;
ANALYZE aloa_project_members;
ANALYZE aloa_project_timeline;
ANALYZE aloa_notification_queue;
ANALYZE aloa_project_files;
ANALYZE aloa_project_responses;
ANALYZE aloa_knowledge_extraction_queue;
ANALYZE aloa_user_profiles;
ANALYZE aloa_applet_library;

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes created successfully!';
  RAISE NOTICE 'Run this script in Supabase SQL Editor to apply the indexes.';
  RAISE NOTICE 'These indexes will significantly improve query performance for:';
  RAISE NOTICE '  - Project dashboard loading';
  RAISE NOTICE '  - User authentication and lookups';
  RAISE NOTICE '  - Applet progress tracking';
  RAISE NOTICE '  - Knowledge system queries';
  RAISE NOTICE '  - Timeline and notification processing';
END $$;