-- ============================================
-- Add Missing Foreign Key Indexes
-- Performance Fix Phase 1
-- ============================================
-- Generated: 2025-09-30
-- Total Indexes: 38
-- Purpose: Improve JOIN query performance and CASCADE operations
-- Risk: LOW (indexes only improve performance)
-- ============================================

-- Applet & Interaction Tables
CREATE INDEX IF NOT EXISTS idx_applet_interactions_stakeholder ON aloa_applet_interactions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_applet_progress_stakeholder ON aloa_applet_progress(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_applets_form_id ON aloa_applets(form_id);
CREATE INDEX IF NOT EXISTS idx_applets_library_applet_id ON aloa_applets(library_applet_id);

-- Chat System Tables
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by ON aloa_chat_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_user_id ON aloa_chat_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_indicators_user_id ON aloa_chat_typing_indicators(user_id);

-- Client Feedback Tables
CREATE INDEX IF NOT EXISTS idx_client_feedback_applet_id ON aloa_client_feedback(applet_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_projectlet_id ON aloa_client_feedback(projectlet_id);

-- Form Response Tables
CREATE INDEX IF NOT EXISTS idx_form_responses_applet_id ON aloa_form_responses(aloa_applet_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_authenticated_user ON aloa_form_responses(authenticated_user_id);

-- Knowledge System Tables
CREATE INDEX IF NOT EXISTS idx_knowledge_extraction_project_id ON aloa_knowledge_extraction_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_form_responses_form_id ON aloa_knowledge_form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_knowledge_b ON aloa_knowledge_relationships(knowledge_id_b);

-- Notification & Achievement Tables
CREATE INDEX IF NOT EXISTS idx_notification_queue_project_id ON aloa_notification_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_projectlet_id ON aloa_notification_queue(projectlet_id);
CREATE INDEX IF NOT EXISTS idx_project_achievements_project_id ON aloa_project_achievements(project_id);

-- Project Tables
CREATE INDEX IF NOT EXISTS idx_project_files_parent_file_id ON aloa_project_files(parent_file_id);
CREATE INDEX IF NOT EXISTS idx_project_forms_projectlet_id ON aloa_project_forms(projectlet_id);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_source_id ON aloa_project_knowledge(source_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON aloa_project_team(user_id);
CREATE INDEX IF NOT EXISTS idx_project_timeline_projectlet_id ON aloa_project_timeline(projectlet_id);

-- Legacy Forms Table
CREATE INDEX IF NOT EXISTS idx_forms_project_id ON forms(project_id);

-- ============================================
-- Verification Query
-- Run this after creating indexes to verify
-- ============================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- Success!
-- You should see 38+ indexes in the results
-- ============================================
