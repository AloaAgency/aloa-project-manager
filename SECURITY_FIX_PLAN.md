# Comprehensive Security Fix Plan for Aloa Project Manager

## Overview
This document provides step-by-step instructions to fix all Row Level Security (RLS) issues in the application. Follow each step in order. Each step is self-contained for context window limitations.

## Current Security Status (Updated from Supabase Linter)
- **15 aloa_ tables** with RLS completely disabled (CRITICAL)
- **3 SECURITY DEFINER views** that bypass RLS
- **1 table** with policies created but RLS not enabled
- **Risk Level: CRITICAL** - Any authenticated user can read/write/delete all data

### Tables Missing RLS (Must Fix):
1. `aloa_projects` - Has policies but RLS NOT enabled!
2. `aloa_projectlet_steps`
3. `aloa_projectlet_step_comments`
4. `aloa_user_profiles`
5. `aloa_applet_library`
6. `aloa_project_templates`
7. `aloa_project_insights`
8. `aloa_applets`
9. `aloa_knowledge_form_responses`
10. `aloa_forms`
11. `aloa_form_response_answers`
12. `aloa_form_responses`
13. `aloa_form_fields`
14. `aloa_applet_progress`
15. `aloa_projectlets` (likely missing from report)

### SECURITY DEFINER Views (Need Review):
1. `aloa_weighted_responses`
2. `aloa_applet_with_user_progress`
3. `aloa_forms_with_stats`

## Phase 1: Foundation Setup (Day 1 Morning)

### Step 1.1: Create Security Testing User
```sql
-- File: /supabase/security_fix_01_create_test_users.sql
-- Create test users for different roles to verify security
DO $$
DECLARE
  -- Implementation note: the actual script handles auth users, profiles, passwords,
  -- and project memberships safely. See /supabase/security_fix_01_create_test_users.sql
  -- for full details.
BEGIN
  RAISE NOTICE 'Run security_fix_01_create_test_users.sql directly in Supabase.';
END $$;

-- Rollback helper (optional): /supabase/security_fix_01_rollback_test_users.sql
```

### Step 1.2: Create Security Helper Functions ✅ COMPLETED
```sql
-- File: /supabase/security_fix_02_security_helpers.sql
-- Helper function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(project_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aloa_project_members
    WHERE project_id = $1 AND user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE user_id = $1 AND role IN ('super_admin', 'project_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT project_id FROM aloa_project_members WHERE user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Phase 2: Fix User Tables (Day 1 Afternoon)

### Step 2.1: Fix aloa_user_profiles
```sql
-- File: /supabase/security_fix_03_enable_user_profiles_rls.sql
-- Enable RLS
ALTER TABLE aloa_user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON aloa_user_profiles;
DROP POLICY IF EXISTS "Service role has full access" ON aloa_user_profiles;

-- Create proper policies
CREATE POLICY "Users can view own profile" ON aloa_user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON aloa_user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM aloa_user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all profiles" ON aloa_user_profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_user_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 2.2: Test User Profiles Security
```sql
-- File: /supabase/04_test_user_profiles.sql
-- Test as different users (run each separately in SQL editor)
-- Set role to test_client
SET ROLE test_client;
SELECT * FROM aloa_user_profiles; -- Should only see own profile

-- Set role to test_admin
SET ROLE test_admin;
SELECT * FROM aloa_user_profiles; -- Should see all profiles

-- Reset role
RESET ROLE;
```

## Phase 3: Fix Core Project Tables (Day 1 Evening)

### Step 3.1: Fix aloa_projects (CRITICAL - Has policies but RLS disabled!)
```sql
-- File: /supabase/05_fix_projects.sql
-- CRITICAL: This table has policies created but RLS is NOT enabled!
ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "View projects" ON aloa_projects;
DROP POLICY IF EXISTS "Admins manage projects" ON aloa_projects;
DROP POLICY IF EXISTS "Service role bypass" ON aloa_projects;

-- Users can view projects they're members of
CREATE POLICY "View own projects" ON aloa_projects
  FOR SELECT USING (
    is_project_member(id, auth.uid()) OR
    is_admin(auth.uid())
  );

-- Only admins can create/update/delete projects
CREATE POLICY "Admins manage projects" ON aloa_projects
  FOR ALL USING (is_admin(auth.uid()));

-- Service role bypass for API operations
CREATE POLICY "Service role bypass" ON aloa_projects
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 3.2: Fix aloa_project_members
```sql
-- File: /supabase/06_fix_project_members.sql
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View project members" ON aloa_project_members;
DROP POLICY IF EXISTS "Admins manage members" ON aloa_project_members;
DROP POLICY IF EXISTS "Service role bypass" ON aloa_project_members;

-- Users can see members of their projects
CREATE POLICY "View project members" ON aloa_project_members
  FOR SELECT USING (
    is_project_member(project_id, auth.uid()) OR
    is_admin(auth.uid())
  );

-- Only admins can add/remove members
CREATE POLICY "Admins manage members" ON aloa_project_members
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_members
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

## Phase 4: Fix Applet and Form Tables (Day 2 Morning)

### Step 4.1: Fix aloa_applets and aloa_applet_progress
```sql
-- File: /supabase/07_fix_applets.sql
ALTER TABLE aloa_applets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_applet_progress ENABLE ROW LEVEL SECURITY;

-- Applets policies
CREATE POLICY "View applets in user projects" ON aloa_applets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlets p
      WHERE p.id = aloa_applets.projectlet_id
      AND EXISTS (
        SELECT 1 FROM aloa_project_members pm
        WHERE pm.project_id = p.project_id
        AND pm.user_id = auth.uid()
      )
    ) OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage applets" ON aloa_applets
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_applets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Applet progress policies
CREATE POLICY "Users view own progress" ON aloa_applet_progress
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users update own progress" ON aloa_applet_progress
  FOR INSERT USING (user_id = auth.uid());

CREATE POLICY "Users modify own progress" ON aloa_applet_progress
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role bypass" ON aloa_applet_progress
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 4.2: Fix aloa_forms and related tables
```sql
-- File: /supabase/08_fix_forms.sql
ALTER TABLE aloa_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_response_answers ENABLE ROW LEVEL SECURITY;

-- Forms policies
CREATE POLICY "View forms in user projects" ON aloa_forms
  FOR SELECT USING (
    is_project_member(project_id, auth.uid()) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Admins manage forms" ON aloa_forms
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_forms
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Form fields policies
CREATE POLICY "View fields for accessible forms" ON aloa_form_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = form_id
      AND (is_project_member(f.project_id, auth.uid()) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Admins manage fields" ON aloa_form_fields
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_form_fields
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Form responses policies
CREATE POLICY "View responses in user projects" ON aloa_form_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = form_id
      AND (is_project_member(f.project_id, auth.uid()) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users submit responses" ON aloa_form_responses
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = form_id
      AND is_project_member(f.project_id, auth.uid())
    )
  );

CREATE POLICY "Service role bypass" ON aloa_form_responses
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Form response answers policies (same as responses)
CREATE POLICY "View answers for accessible responses" ON aloa_form_response_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_form_responses r
      JOIN aloa_forms f ON f.id = r.form_id
      WHERE r.id = response_id
      AND (is_project_member(f.project_id, auth.uid()) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Service role bypass" ON aloa_form_response_answers
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 4.3: Fix aloa_projectlets and related tables
```sql
-- File: /supabase/09_fix_projectlets.sql
ALTER TABLE aloa_projectlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_step_comments ENABLE ROW LEVEL SECURITY;

-- Projectlets policies
CREATE POLICY "View projectlets in user projects" ON aloa_projectlets
  FOR SELECT USING (
    is_project_member(project_id, auth.uid()) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Admins manage projectlets" ON aloa_projectlets
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projectlets
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Projectlet steps policies
CREATE POLICY "View steps in user projectlets" ON aloa_projectlet_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlets p
      WHERE p.id = projectlet_id
      AND (is_project_member(p.project_id, auth.uid()) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Admins manage steps" ON aloa_projectlet_steps
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projectlet_steps
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Step comments policies
CREATE POLICY "View comments on accessible steps" ON aloa_projectlet_step_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlet_steps s
      JOIN aloa_projectlets p ON p.id = s.projectlet_id
      WHERE s.id = step_id
      AND (is_project_member(p.project_id, auth.uid()) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Project members can comment" ON aloa_projectlet_step_comments
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlet_steps s
      JOIN aloa_projectlets p ON p.id = s.projectlet_id
      WHERE s.id = step_id
      AND is_project_member(p.project_id, auth.uid())
    )
  );

CREATE POLICY "Service role bypass" ON aloa_projectlet_step_comments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 4.4: Fix library and template tables
```sql
-- File: /supabase/10_fix_library_tables.sql
ALTER TABLE aloa_applet_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_insights ENABLE ROW LEVEL SECURITY;

-- Applet library (everyone can read, only admins can modify)
CREATE POLICY "Anyone can view library" ON aloa_applet_library
  FOR SELECT USING (true);

CREATE POLICY "Admins manage library" ON aloa_applet_library
  FOR INSERT USING (is_admin(auth.uid()));

CREATE POLICY "Admins update library" ON aloa_applet_library
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins delete library" ON aloa_applet_library
  FOR DELETE USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_applet_library
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Project templates (same as library)
CREATE POLICY "Anyone can view templates" ON aloa_project_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins manage templates" ON aloa_project_templates
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_templates
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Project insights
CREATE POLICY "View insights for user projects" ON aloa_project_insights
  FOR SELECT USING (
    is_project_member(project_id, auth.uid()) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Service role manage insights" ON aloa_project_insights
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

## Phase 5: Fix Knowledge Tables (Day 2 Afternoon)

### Step 5.1: Fix aloa_project_knowledge and related tables
```sql
-- File: /supabase/11_fix_knowledge.sql
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View project knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Manage project knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Service role bypass" ON aloa_project_knowledge;

-- Users can view knowledge for their projects
CREATE POLICY "View project knowledge" ON aloa_project_knowledge
  FOR SELECT USING (
    is_project_member(project_id, auth.uid()) OR
    is_admin(auth.uid())
  );

-- Only admins and service role can modify knowledge
CREATE POLICY "Admins manage knowledge" ON aloa_project_knowledge
  FOR INSERT USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_knowledge
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Knowledge form responses policies
CREATE POLICY "View knowledge responses for user projects" ON aloa_knowledge_form_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM aloa_project_knowledge pk
      WHERE pk.id = knowledge_id
      AND (is_project_member(pk.project_id, auth.uid()) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Service role manage responses" ON aloa_knowledge_form_responses
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Step 5.2: Fix aloa_knowledge_extraction_queue
```sql
-- File: /supabase/08_fix_extraction_queue.sql
ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access the queue
CREATE POLICY "Admin view queue" ON aloa_knowledge_extraction_queue
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Service role manage queue" ON aloa_knowledge_extraction_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

## Phase 6: Fix SECURITY DEFINER Views (Day 2 Evening)

### Step 6.1: Review and Fix SECURITY DEFINER Views
```sql
-- File: /supabase/12_fix_security_definer_views.sql
-- SECURITY DEFINER views bypass RLS, so we need to be careful

-- Option 1: Convert to regular views (RECOMMENDED for most cases)
-- This makes the views respect RLS of the querying user

-- Fix aloa_weighted_responses view
DROP VIEW IF EXISTS aloa_weighted_responses CASCADE;
CREATE VIEW aloa_weighted_responses AS
  -- [recreate view definition without SECURITY DEFINER]
  SELECT * FROM aloa_form_responses; -- Replace with actual view logic

-- Fix aloa_applet_with_user_progress view
DROP VIEW IF EXISTS aloa_applet_with_user_progress CASCADE;
CREATE VIEW aloa_applet_with_user_progress AS
  -- [recreate view definition without SECURITY DEFINER]
  SELECT a.*, ap.*
  FROM aloa_applets a
  LEFT JOIN aloa_applet_progress ap ON a.id = ap.applet_id;

-- Fix aloa_forms_with_stats view
DROP VIEW IF EXISTS aloa_forms_with_stats CASCADE;
CREATE VIEW aloa_forms_with_stats AS
  -- [recreate view definition without SECURITY DEFINER]
  SELECT f.*, COUNT(r.id) as response_count
  FROM aloa_forms f
  LEFT JOIN aloa_form_responses r ON f.id = r.form_id
  GROUP BY f.id;

-- Option 2: If SECURITY DEFINER is truly needed, add internal checks
-- Only use this if the view needs to access data the user shouldn't directly access
-- CREATE OR REPLACE VIEW view_name AS
-- SELECT * FROM table WHERE project_id IN (
--   SELECT project_id FROM aloa_project_members WHERE user_id = auth.uid()
-- );
```

## Phase 7: Update API Routes (Day 3 Morning)

### Step 5.0: Input Validation for Project Insights ✅ COMPLETED
The `/api/project-knowledge/[projectId]/insights` endpoint now includes comprehensive input validation:

**Security Improvements Implemented:**
```javascript
// UUID validation for projectId parameter
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!projectId || !uuidRegex.test(projectId)) {
  return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
}

// Type checking and sanitization
if (!question || typeof question !== 'string') {
  return NextResponse.json({ error: 'Question is required and must be a string' }, { status: 400 });
}

// Length limit to prevent abuse
const MAX_QUESTION_LENGTH = 500;
if (question.length > MAX_QUESTION_LENGTH) {
  return NextResponse.json({ error: `Question must be ${MAX_QUESTION_LENGTH} characters or less` }, { status: 400 });
}

// Control character sanitization
const sanitizedQuestion = question.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
```

**Protections Added:**
- Prevents SQL injection via invalid project IDs
- Blocks non-string inputs that could cause type confusion
- Limits input length to prevent resource exhaustion
- Sanitizes control characters that could cause parsing issues
- Validates empty inputs after sanitization

**Test Coverage:** All 10 security test cases pass including:
- Valid requests work correctly
- Invalid UUID formats rejected
- SQL injection attempts blocked
- XSS attempts handled safely
- Excessive length inputs rejected

## Phase 5: Update API Routes (Day 2 Afternoon)

### Step 5.1: Verify Service Client Usage
Check each API route uses `createServiceClient()` for system operations:

**Files to check:**
1. `/app/api/aloa-projects/[projectId]/knowledge/route.js`
2. `/app/api/aloa-projects/[projectId]/route.js`
3. `/app/api/auth/users/route.js`
4. `/app/api/project-knowledge/[projectId]/route.js`

**Pattern to follow:**
```javascript
import { createServiceClient } from '@/lib/supabase-service';

export async function GET(request) {
  // For system operations that need to bypass RLS
  const supabase = createServiceClient();

  // For user-specific operations
  const userSupabase = createClient(url, anonKey, {
    cookies: () => cookies()
  });
}
```

### Step 5.2: Update Error Handling
Add proper error handling for RLS violations:
```javascript
if (error?.code === '42501') {
  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  );
}
```

## Phase 8: Testing & Validation (Day 3 Afternoon)

### Step 6.1: Create Test Script
```sql
-- File: /supabase/09_security_tests.sql
-- Run as different roles to verify security

-- Test 1: Client can only see their project
SET ROLE test_client;
SELECT COUNT(*) FROM aloa_projects; -- Should be 1
SELECT COUNT(*) FROM aloa_project_knowledge; -- Only their project's knowledge

-- Test 2: Outsider sees nothing
SET ROLE test_outsider;
SELECT COUNT(*) FROM aloa_projects WHERE id = '511306f6-0316-4a60-a318-1509d643238a'; -- Should be 0

-- Test 3: Admin sees all
SET ROLE test_admin;
SELECT COUNT(*) FROM aloa_projects; -- Should see all

RESET ROLE;
```

### Step 6.2: Test All Features
Create a checklist and test each feature with different user roles:

- [ ] Login as client - verify can only see assigned project
- [ ] Login as admin - verify can see all projects
- [ ] Test knowledge base save - should work via service role
- [ ] Test form submissions - should respect project boundaries
- [ ] Test file uploads - should be project-isolated

## Phase 9: Cleanup & Documentation (Day 3 Evening)

### Step 7.1: Remove Temporary Fixes
```sql
-- File: /supabase/10_cleanup.sql
-- List of files to archive or remove
-- Move these to /supabase/archive/ folder:
-- - temporary_permissive_policy.sql
-- - disable_knowledge_triggers_on_projects.sql
-- - enable_service_role_knowledge_access.sql (the permissive one)
```

### Step 7.2: Document Security Model
Create `/SECURITY.md` explaining:
- Which tables have RLS
- What each policy does
- How service role is used
- Testing procedures

## Implementation Order

**Day 1:**
1. Morning: Phase 1 (Foundation) - 2 hours
2. Afternoon: Phase 2 (User Tables) - 2 hours
3. Evening: Phase 3 (Core Project Tables) - 2 hours

**Day 2:**
1. Morning: Phase 4 (Applet and Form Tables) - 3 hours
2. Afternoon: Phase 5 (Knowledge Tables) - 2 hours
3. Evening: Phase 6 (SECURITY DEFINER Views) - 1 hour

**Day 3:**
1. Morning: Phase 7 (API Updates) - 3 hours
2. Afternoon: Phase 8 (Testing) - 2 hours
3. Evening: Phase 9 (Cleanup & Documentation) - 1 hour

**Total Time: ~19 hours over 3 days**

## Critical Success Factors

1. **Test after each phase** - Don't move forward if tests fail
2. **Keep service role for system operations** - API routes should use service client
3. **User operations go through RLS** - Frontend/user actions respect policies
4. **Document everything** - Future developers need to understand security model

## Emergency Rollback

If something breaks critically:
```sql
-- File: /supabase/emergency_rollback.sql
-- ONLY USE IN EMERGENCY - This disables all security!
-- Run this if the app stops working after enabling RLS

-- Core tables
ALTER TABLE aloa_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_user_profiles DISABLE ROW LEVEL SECURITY;

-- Projectlet tables
ALTER TABLE aloa_projectlets DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_step_comments DISABLE ROW LEVEL SECURITY;

-- Applet tables
ALTER TABLE aloa_applets DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_applet_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_applet_library DISABLE ROW LEVEL SECURITY;

-- Form tables
ALTER TABLE aloa_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_response_answers DISABLE ROW LEVEL SECURITY;

-- Knowledge tables
ALTER TABLE aloa_project_knowledge DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_form_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_extraction_queue DISABLE ROW LEVEL SECURITY;

-- Other tables
ALTER TABLE aloa_project_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_insights DISABLE ROW LEVEL SECURITY;
```

## Notes for Claude Code

When implementing each phase:
1. Read only the specific phase section
2. Create the SQL files as specified
3. Test immediately after running each SQL
4. If errors occur, DO NOT disable RLS - ask for help
5. Move to next phase only after current phase tests pass

## Completion Checklist

- [ ] Phase 1: Foundation Complete
  - [ ] Step 1.1: Create Test Users
  - [x] Step 1.2: Create Security Helper Functions ✅
- [ ] Phase 2: User Tables Secured (aloa_user_profiles)
  - [x] Step 2.1: Fix aloa_user_profiles
  - [x] Step 2.2: Test User Profiles Security
- [ ] Phase 3: Core Project Tables Secured
  - [ ] aloa_projects (CRITICAL - has policies but RLS disabled!)
  - [ ] aloa_project_members
- [ ] Phase 4: Applet and Form Tables Secured
  - [ ] aloa_applets, aloa_applet_progress
  - [ ] aloa_forms, aloa_form_fields
  - [ ] aloa_form_responses, aloa_form_response_answers
  - [ ] aloa_projectlets, aloa_projectlet_steps, aloa_projectlet_step_comments
  - [ ] aloa_applet_library, aloa_project_templates, aloa_project_insights
- [ ] Phase 5: Knowledge Tables Secured
  - [ ] aloa_project_knowledge
  - [ ] aloa_knowledge_form_responses
  - [ ] aloa_knowledge_extraction_queue
- [ ] Phase 6: SECURITY DEFINER Views Fixed
  - [ ] aloa_weighted_responses
  - [ ] aloa_applet_with_user_progress
  - [ ] aloa_forms_with_stats
- [ ] Phase 7: API Routes Updated
  - [x] Step 7.0: Input Validation for Project Insights ✅
  - [ ] Step 7.1: Verify Service Client Usage
  - [x] Step 7.2: Update Error Handling ✅
- [ ] Phase 8: All Tests Pass
- [ ] Phase 9: Cleanup & Documentation Complete
- [ ] Production Deploy Ready

## Support

If stuck at any phase:
1. Check error messages for "permission denied" - indicates RLS working
2. Verify using correct client (service vs user)
3. Test with SQL queries before testing in app
4. Each phase is independent - can pause between phases
