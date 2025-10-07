# Performance Optimization Plan

**Generated from:** Supabase Performance Advisor Export (2025-09-30)
**Total Issues:** 203
**Priority:** Medium (these are optimizations, not critical bugs)

## Executive Summary

Supabase's Performance Advisor has identified 203 performance optimization opportunities:
- **165 Unused Indexes** - Indexes that exist but aren't being used by queries (safe to drop for better write performance)
- **38 Unindexed Foreign Keys** - Foreign key columns without indexes (can cause slow JOIN queries)

## Impact Assessment

### Unused Indexes (165 issues)
- **Risk:** LOW - Dropping unused indexes is safe and recommended
- **Benefit:** Faster INSERT/UPDATE/DELETE operations, reduced storage
- **Effort:** LOW - Simple DROP INDEX statements

### Unindexed Foreign Keys (38 issues)
- **Risk:** MEDIUM - Adding indexes requires testing query performance
- **Benefit:** Significantly faster JOIN queries and CASCADE operations
- **Effort:** MEDIUM - Need to create indexes and monitor impact

---

## Phase 1: Add Missing Foreign Key Indexes (38 issues)

**Priority:** HIGH - These directly impact query performance
**Estimated Time:** 1-2 hours
**Risk:** Low (indexes only improve performance)

### 1.1 Applet & Interaction Tables

```sql
-- aloa_applet_interactions table
CREATE INDEX IF NOT EXISTS idx_applet_interactions_stakeholder
ON aloa_applet_interactions(stakeholder_id);

-- aloa_applet_progress table
CREATE INDEX IF NOT EXISTS idx_applet_progress_stakeholder
ON aloa_applet_progress(stakeholder_id);

-- aloa_applets table (2 missing indexes)
CREATE INDEX IF NOT EXISTS idx_applets_form_id
ON aloa_applets(form_id);

CREATE INDEX IF NOT EXISTS idx_applets_library_applet_id
ON aloa_applets(library_applet_id);
```

### 1.2 Chat System Tables

```sql
-- aloa_chat_conversations table
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by
ON aloa_chat_conversations(created_by);

-- aloa_chat_read_receipts table
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_user_id
ON aloa_chat_read_receipts(user_id);

-- aloa_chat_typing_indicators table
CREATE INDEX IF NOT EXISTS idx_chat_typing_indicators_user_id
ON aloa_chat_typing_indicators(user_id);
```

### 1.3 Client Feedback Tables

```sql
-- aloa_client_feedback table (2 missing indexes)
CREATE INDEX IF NOT EXISTS idx_client_feedback_applet_id
ON aloa_client_feedback(applet_id);

CREATE INDEX IF NOT EXISTS idx_client_feedback_projectlet_id
ON aloa_client_feedback(projectlet_id);
```

### 1.4 Form Response Tables

```sql
-- aloa_form_responses table (2 missing indexes)
CREATE INDEX IF NOT EXISTS idx_form_responses_applet_id
ON aloa_form_responses(aloa_applet_id);

CREATE INDEX IF NOT EXISTS idx_form_responses_authenticated_user
ON aloa_form_responses(authenticated_user_id);
```

### 1.5 Knowledge System Tables

```sql
-- aloa_knowledge_extraction_queue table
CREATE INDEX IF NOT EXISTS idx_knowledge_extraction_project_id
ON aloa_knowledge_extraction_queue(project_id);

-- aloa_knowledge_form_responses table
CREATE INDEX IF NOT EXISTS idx_knowledge_form_responses_form_id
ON aloa_knowledge_form_responses(form_id);

-- aloa_knowledge_relationships table
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_knowledge_b
ON aloa_knowledge_relationships(knowledge_id_b);
```

### 1.6 Notification & Achievement Tables

```sql
-- aloa_notification_queue table (2 missing indexes)
CREATE INDEX IF NOT EXISTS idx_notification_queue_project_id
ON aloa_notification_queue(project_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_projectlet_id
ON aloa_notification_queue(projectlet_id);

-- aloa_project_achievements table
CREATE INDEX IF NOT EXISTS idx_project_achievements_project_id
ON aloa_project_achievements(project_id);
```

### 1.7 Project Tables

```sql
-- aloa_project_files table
CREATE INDEX IF NOT EXISTS idx_project_files_parent_file_id
ON aloa_project_files(parent_file_id);

-- aloa_project_forms table
CREATE INDEX IF NOT EXISTS idx_project_forms_projectlet_id
ON aloa_project_forms(projectlet_id);

-- aloa_project_knowledge table
CREATE INDEX IF NOT EXISTS idx_project_knowledge_source_id
ON aloa_project_knowledge(source_id);

-- aloa_project_team table
CREATE INDEX IF NOT EXISTS idx_project_team_user_id
ON aloa_project_team(user_id);

-- aloa_project_timeline table
CREATE INDEX IF NOT EXISTS idx_project_timeline_projectlet_id
ON aloa_project_timeline(projectlet_id);
```

### 1.8 Projectlet & Response Tables

```sql
-- aloa_projectlets table
CREATE INDEX IF NOT EXISTS idx_projectlets_milestone_id
ON aloa_projectlets(milestone_id);

-- aloa_responses table
CREATE INDEX IF NOT EXISTS idx_responses_form_id
ON aloa_responses(form_id);

-- aloa_stakeholders table
CREATE INDEX IF NOT EXISTS idx_stakeholders_created_by
ON aloa_stakeholders(created_by);

-- forms table
CREATE INDEX IF NOT EXISTS idx_forms_user_id
ON forms(user_id);
```

### 1.9 Complete Script - Run All at Once

Create file: `/supabase/add_missing_foreign_key_indexes.sql`

```sql
-- ============================================
-- Add Missing Foreign Key Indexes
-- Performance Fix Phase 1
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

-- Projectlet & Response Tables
CREATE INDEX IF NOT EXISTS idx_projectlets_milestone_id ON aloa_projectlets(milestone_id);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON aloa_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_created_by ON aloa_stakeholders(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);

-- Verify indexes were created
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

---

## Phase 2: Remove Unused Indexes (165 issues)

**Priority:** MEDIUM - Nice to have, but not urgent
**Estimated Time:** 2-3 hours
**Risk:** VERY LOW - These indexes aren't being used

**Note:** The CSV contains 165 unused index entries. Before dropping these, we should:
1. Verify they're truly unused (run EXPLAIN ANALYZE on critical queries)
2. Consider if they might be needed for future features
3. Drop them in batches and monitor performance

### 2.1 Analysis Required

The Performance Advisor identified these indexes as unused, but we need to verify:
- Are there any admin queries that use them?
- Are they needed for specific report generation?
- Could removing them impact data integrity constraints?

### 2.2 Safe Removal Strategy

```sql
-- Step 1: Document all unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0  -- Never used
    AND indexrelid::regclass::text NOT LIKE '%_pkey'  -- Not primary keys
    AND indexrelid::regclass::text NOT LIKE '%_fkey'  -- Not foreign keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- Step 2: Drop unused indexes (run one at a time and test)
-- DO NOT run this script blindly - review each index first!

-- DROP INDEX IF EXISTS index_name_here;
```

### 2.3 Unused Index List

**Action Required:** Export detailed list from CSV and review each one individually.

The 165 unused indexes should be reviewed in categories:
1. **Auto-generated indexes** (safe to drop)
2. **Explicitly created indexes** (review why they were created)
3. **Unique constraint indexes** (DO NOT DROP - these enforce data integrity)

---

## Testing & Validation

### After Phase 1 (Adding Foreign Key Indexes)

```sql
-- 1. Verify all indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename;

-- 2. Check index usage after 24 hours
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as rows_read,
    idx_tup_fetch as rows_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- 3. Monitor query performance
-- Run your slowest queries and compare execution times
EXPLAIN ANALYZE
SELECT * FROM aloa_applets WHERE form_id = 'some-uuid';
```

### After Phase 2 (Removing Unused Indexes)

```sql
-- 1. Monitor for slow queries
SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking >100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Check for missing indexes
-- Re-run Performance Advisor to see if we removed anything important
```

---

## Implementation Schedule

### Day 1: Add Foreign Key Indexes (Phase 1)
- **Morning:** Create and test SQL script
- **Afternoon:** Run script in Supabase SQL Editor
- **Evening:** Verify all indexes created, monitor performance

### Day 2: Monitor & Analyze
- **All Day:** Monitor query performance with new indexes
- Collect data on index usage
- Identify which indexes are actually being used

### Day 3: Review Unused Indexes (Phase 2 Prep)
- Export detailed list of 165 unused indexes
- Categorize by type (auto-generated vs explicit)
- Mark indexes safe to drop vs. need review

### Week 2: Begin Dropping Unused Indexes (Optional)
- Drop indexes in small batches (10-20 at a time)
- Monitor after each batch
- Document any issues

---

## Rollback Procedures

### If Queries Become Slow After Phase 1

```sql
-- Drop any problematic new index
DROP INDEX IF EXISTS idx_name_that_caused_issues;

-- Postgres will automatically fall back to existing query plans
```

### If Queries Become Slow After Phase 2

```sql
-- Recreate any index that was removed
CREATE INDEX idx_name_here ON table_name(column_name);

-- Reanalyze table to update statistics
ANALYZE table_name;
```

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ All 38 foreign key indexes created without errors
- ✅ No increase in query execution times
- ✅ New indexes showing usage after 24 hours
- ✅ Faster JOIN queries on affected tables

### Phase 2 Success Criteria
- ✅ Reduced database storage usage
- ✅ Faster INSERT/UPDATE/DELETE operations
- ✅ No slow query regressions
- ✅ No application errors

---

## Notes & Considerations

### Why This Matters

**Foreign Key Indexes (Phase 1):**
- PostgreSQL doesn't automatically index foreign key columns
- Without indexes, CASCADE deletes and JOIN queries scan entire tables
- Can cause exponential slowdown as data grows

**Unused Indexes (Phase 2):**
- Every index slows down INSERT/UPDATE/DELETE operations
- Unused indexes waste storage and memory
- Postgres has to maintain indexes even if they're never used

### When to Skip

**Skip Phase 2 if:**
- Your database is small (<10GB)
- Write performance is not an issue
- You're adding new features that might use these indexes

**Always Do Phase 1:**
- Foreign key indexes almost always improve performance
- Very low risk, high reward
- Essential for production apps with relational data

---

## Related Documentation

- [Supabase Performance Advisor](https://supabase.com/docs/guides/database/database-linter)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [EXPLAIN ANALYZE Guide](https://www.postgresql.org/docs/current/using-explain.html)

---

## Status Tracking

- [ ] Phase 1.1-1.8: Add all foreign key indexes
- [ ] Verify indexes created successfully
- [ ] Monitor performance for 24 hours
- [ ] Review unused index list from CSV
- [ ] Categorize unused indexes
- [ ] Begin dropping unused indexes (optional)
- [ ] Final performance validation
