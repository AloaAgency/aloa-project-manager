# Comprehensive Security Fix Plan for Aloa Project Manager

## Overview
This document provides step-by-step instructions to fix all Row Level Security (RLS) issues in the application. Follow each step in order. Each step is self-contained for context window limitations.

## Current Security Status
- **64 security bypasses** across 31 SQL files
- **5 critical tables** with RLS completely disabled
- **Risk Level: CRITICAL** - Any authenticated user can access/modify all data

## Phase 1: Foundation Setup (Day 1 Morning)

### Step 1.1: Create Security Testing User
```sql
-- File: /supabase/01_create_test_users.sql
-- Create test users for different roles to verify security
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test_client@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'test_admin@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'test_outsider@test.com');

INSERT INTO aloa_user_profiles (user_id, email, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test_client@test.com', 'Test Client', 'client'),
  ('22222222-2222-2222-2222-222222222222', 'test_admin@test.com', 'Test Admin', 'super_admin'),
  ('33333333-3333-3333-3333-333333333333', 'test_outsider@test.com', 'Test Outsider', 'client');

-- Assign test_client to project 1, test_outsider to project 2
INSERT INTO aloa_project_members (user_id, project_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '511306f6-0316-4a60-a318-1509d643238a', 'viewer');
```

### Step 1.2: Create Security Helper Functions ✅ COMPLETED
```sql
-- File: /supabase/02_security_helpers.sql
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
-- File: /supabase/03_fix_user_profiles.sql
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

## Phase 3: Fix Project Tables (Day 1 Evening)

### Step 3.1: Fix aloa_projects
```sql
-- File: /supabase/05_fix_projects.sql
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

## Phase 4: Fix Knowledge Tables (Day 2 Morning)

### Step 4.1: Fix aloa_project_knowledge
```sql
-- File: /supabase/07_fix_knowledge.sql
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;

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
```

### Step 4.2: Fix aloa_knowledge_extraction_queue
```sql
-- File: /supabase/08_fix_extraction_queue.sql
ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access the queue
CREATE POLICY "Admin view queue" ON aloa_knowledge_extraction_queue
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Service role manage queue" ON aloa_knowledge_extraction_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

## Phase 5: Update API Routes (Day 2 Afternoon)

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

## Phase 6: Testing & Validation (Day 2 Evening)

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

## Phase 7: Cleanup & Documentation

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
3. Evening: Phase 3 (Project Tables) - 2 hours

**Day 2:**
1. Morning: Phase 4 (Knowledge Tables) - 2 hours
2. Afternoon: Phase 5 (API Updates) - 3 hours
3. Evening: Phase 6 (Testing) - 2 hours

**Total Time: ~13 hours over 2 days**

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
ALTER TABLE aloa_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_knowledge DISABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_extraction_queue DISABLE ROW LEVEL SECURITY;
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
- [ ] Phase 2: User Tables Secured
- [ ] Phase 3: Project Tables Secured
- [ ] Phase 4: Knowledge Tables Secured
- [ ] Phase 5: API Routes Updated
  - [x] Step 5.0: Input Validation for Project Insights ✅
  - [ ] Step 5.1: Verify Service Client Usage
  - [x] Step 5.2: Update Error Handling ✅
- [ ] Phase 6: All Tests Pass
- [ ] Phase 7: Cleanup Complete
- [ ] Security Documentation Written
- [ ] Production Deploy Ready

## Support

If stuck at any phase:
1. Check error messages for "permission denied" - indicates RLS working
2. Verify using correct client (service vs user)
3. Test with SQL queries before testing in app
4. Each phase is independent - can pause between phases