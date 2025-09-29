# Comprehensive Security Fix Plan for Aloa Project Manager

## Overview
This document provides step-by-step instructions to fix all Row Level Security (RLS) issues in the application. Follow each step in order. Each step is self-contained for context window limitations.

**Reference:** Keep `docs/RLS_SECURITY_TEMPLATE.sql` handy while applying each fix. It captures external security guidance on enabling RLS, revoking default grants, and structuring SELECT/INSERT/UPDATE/DELETE policies. Every table fix should be cross-checked against that template to avoid the pitfalls highlighted by the advisors.

### General RLS Checklist (from advisors)
1. Enable RLS on the table.
2. Revoke implicit grants from `public`, `anon`, and `authenticated` unless absolutely required.
3. Add narrowly-scoped GRANT statements only when public metadata access is intentional.
4. Create explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, ensuring each policy lines up with `is_project_member`, `is_admin`, or JWT checks.
5. Confirm service-role bypass policies exist only where system automation requires it.

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
16. `aloa_project_phases`

### SECURITY DEFINER Views (Need Review):
1. `aloa_weighted_responses`
2. `aloa_applet_with_user_progress`
3. `aloa_forms_with_stats`
4. `phase_overview` (verify usage; flagged by linter)

## Phase 1: Foundation Setup (Day 1 Morning)

### Step 1.0: Disable Self-Service Signups ✅ COMPLETED
```text
- Supabase dashboard: Settings → Authentication → Disable email/password signup.
- Run /supabase/security_fix_00_disable_public_signup.sql (documentation).
- Ensure `lib/supabase-auth.js` has self-service signup disabled unless
  `NEXT_PUBLIC_ENABLE_SELF_SIGNUP` is true.
```

### Step 1.1: Create Security Testing User ✅ COMPLETED
```sql
-- File: /supabase/security_fix_01_create_test_users.sql
-- Create test users for different roles to verify security
DO $$
DECLARE
  -- Implementation note: the actual script handles auth users, profiles, passwords,
  -- and project memberships safely. See /supabase/security_fix_01_create_test_users.sql
  -- for full details.
BEGIN
  RAISE NOTICE 'Run security_fix_01_create_test_users.sql directly in Supabase. ✅ Completed';
END $$;

-- Rollback helper (optional): /supabase/security_fix_01_rollback_test_users.sql
```

### Step 1.2: Create Security Helper Functions ✅ COMPLETED
```sql
-- File: /supabase/security_fix_02_security_helpers.sql ✅ Completed
-- Helper function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(project_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aloa_project_members
    WHERE aloa_project_members.project_id = is_project_member.project_id
      AND aloa_project_members.user_id = is_project_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE aloa_user_profiles.id = is_admin.user_id
      AND aloa_user_profiles.role IN ('super_admin', 'project_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get user's projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT aloa_project_members.project_id
  FROM aloa_project_members
  WHERE aloa_project_members.user_id = get_user_projects.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_projects(UUID) TO authenticated;
```

## Phase 2: Fix User Tables (Day 1 Afternoon)

### Step 2.1: Fix aloa_user_profiles
```sql
-- File: /supabase/security_fix_03_enable_user_profiles_rls.sql ✅ Completed
-- Helper to read the caller's current role (avoids recursion)
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT role INTO result
  FROM aloa_user_profiles
  WHERE id = user_id;
  RETURN result;
END;
$$;

ALTER TABLE aloa_user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'aloa_user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_user_profiles', pol.policyname);
  END LOOP;
END $$;

-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON aloa_user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins can see every profile
CREATE POLICY "Admins can view all profiles" ON aloa_user_profiles
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- Users can update their own profile; role changes still restricted
CREATE POLICY "Users can update own profile" ON aloa_user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      is_admin(auth.uid())
      OR role = get_user_role(auth.uid())
    )
  );

-- Service role bypass for system tasks
CREATE POLICY "Service role bypass" ON aloa_user_profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

### Step 2.2: Test User Profiles Security
```text
- Verify via seeded accounts (test_client@test.com, test_admin@test.com, test_outsider@test.com)
- Use the `/admin/users` page to ensure:
  • Client sees only their own profile data
  • Admin sees all profiles and can manage users
  • Outsider cannot access restricted pages
- Optional: create an automated SQL test script if manual checks uncover gaps
```

## Phase 3: Fix Core Project Tables (Day 1 Evening)

### Step 3.1: Fix aloa_projects (CRITICAL - Has policies but RLS disabled!) ✅ COMPLETED
```sql
-- File: /supabase/security_fix_05_enable_projects_rls.sql

-- 1. Enable RLS and revoke blanket grants
ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aloa_projects FROM PUBLIC;
REVOKE ALL ON aloa_projects FROM anon;
REVOKE ALL ON aloa_projects FROM authenticated;

-- 2. Grant minimal privileges back (RLS will enforce row access)
GRANT SELECT, INSERT, UPDATE, DELETE ON aloa_projects TO authenticated;
GRANT ALL ON aloa_projects TO service_role;

-- 3. Drop existing policies and recreate explicit ones
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'aloa_projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_projects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Projects visible to members or admins" ON aloa_projects
  FOR SELECT TO authenticated
  USING (
    is_project_member(id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_projects.id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins can insert projects" ON aloa_projects
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update projects" ON aloa_projects
  FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete projects" ON aloa_projects
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projects
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Validation checklist
--  * Run this script in Supabase SQL (or migrations) and ensure no errors.
--  * Confirm `/app/api/aloa-projects/route.js` uses `createServiceClient()` so admin views bypass RLS safely.
--  * Test with seeded users: `test_admin` sees all projects, regular members see their own, outsiders receive 403/empty result.
```

### Step 3.2: Fix aloa_project_members & stakeholders ✅ COMPLETED
```sql
-- File: /supabase/security_fix_06_enable_project_members_rls.sql
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_stakeholders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate for both tables
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('aloa_project_members', 'aloa_project_stakeholders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View project members" ON aloa_project_members
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_members.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage members" ON aloa_project_members
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_members
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View project stakeholders" ON aloa_project_stakeholders
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR user_id = auth.uid()
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage stakeholders" ON aloa_project_stakeholders
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_stakeholders
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

## Phase 4: Fix Applet and Form Tables (Day 2 Morning)

### Step 4.1: Fix aloa_applets and aloa_applet_progress ✅ COMPLETED
```sql
-- File: /supabase/security_fix_07_enable_applets_rls.sql
ALTER TABLE aloa_applets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_applet_progress ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('aloa_applets', 'aloa_applet_progress')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View applets in user projects" ON aloa_applets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlets p
      WHERE p.id = aloa_applets.projectlet_id
        AND (
          is_project_member(p.project_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM aloa_project_stakeholders s
            WHERE s.project_id = p.project_id
              AND s.user_id = auth.uid()
          )
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage applets" ON aloa_applets
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_applets
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users view own progress" ON aloa_applet_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text OR is_admin(auth.uid()));

CREATE POLICY "Users insert own progress" ON aloa_applet_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users modify own progress" ON aloa_applet_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Service role bypass" ON aloa_applet_progress
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

### Step 4.2: Fix aloa_forms and related tables ✅ COMPLETED
```sql
-- File: /supabase/security_fix_08_enable_forms_rls.sql
ALTER TABLE aloa_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_form_response_answers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_forms', 'aloa_form_fields',
        'aloa_form_responses', 'aloa_form_response_answers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View forms in user projects" ON aloa_forms
  FOR SELECT TO authenticated
  USING (
    (aloa_project_id IS NOT NULL AND (
      is_project_member(aloa_project_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM aloa_project_stakeholders s
        WHERE s.project_id = aloa_forms.aloa_project_id
          AND s.user_id = auth.uid()
      )
    ))
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage forms" ON aloa_forms
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_forms
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View fields for accessible forms" ON aloa_form_fields
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
  WHERE f.id = aloa_form_fields.aloa_form_id
        AND (
          (f.aloa_project_id IS NOT NULL AND (
            is_project_member(f.aloa_project_id, auth.uid())
            OR EXISTS (
              SELECT 1 FROM aloa_project_stakeholders s
              WHERE s.project_id = f.aloa_project_id
                AND s.user_id = auth.uid()
            )
          ))
          OR is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Admins manage fields" ON aloa_form_fields
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_form_fields
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View responses in user projects" ON aloa_form_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_responses.aloa_form_id
        AND (
          (f.aloa_project_id IS NOT NULL AND (
            is_project_member(f.aloa_project_id, auth.uid())
            OR EXISTS (
              SELECT 1 FROM aloa_project_stakeholders s
              WHERE s.project_id = f.aloa_project_id
                AND s.user_id = auth.uid()
            )
          ))
          OR is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Users submit responses" ON aloa_form_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_forms f
      WHERE f.id = aloa_form_responses.aloa_form_id
        AND f.aloa_project_id IS NOT NULL
        AND is_project_member(f.aloa_project_id, auth.uid())
    )
  );

CREATE POLICY "Service role bypass" ON aloa_form_responses
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View answers for accessible responses" ON aloa_form_response_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_form_responses r
      JOIN aloa_forms f ON f.id = r.aloa_form_id
      WHERE r.id = aloa_form_response_answers.response_id
        AND (
          (f.aloa_project_id IS NOT NULL AND (
            is_project_member(f.aloa_project_id, auth.uid())
            OR EXISTS (
              SELECT 1 FROM aloa_project_stakeholders s
              WHERE s.project_id = f.aloa_project_id
                AND s.user_id = auth.uid()
            )
          ))
          OR is_admin(auth.uid())
        )
    )
  );

CREATE POLICY "Service role bypass" ON aloa_form_response_answers
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

### Step 4.3: Fix aloa_projectlets and related tables ✅ COMPLETED
```sql
-- File: /supabase/security_fix_09_enable_projectlets_rls.sql
ALTER TABLE aloa_projectlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_projectlet_step_comments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_projectlets',
        'aloa_projectlet_steps',
        'aloa_projectlet_step_comments'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View projectlets in user projects" ON aloa_projectlets
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_projectlets.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage projectlets" ON aloa_projectlets
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projectlets
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View steps in user projectlets" ON aloa_projectlet_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlets p
      WHERE p.id = aloa_projectlet_steps.projectlet_id
        AND (
          is_project_member(p.project_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM aloa_project_stakeholders s
            WHERE s.project_id = p.project_id
              AND s.user_id = auth.uid()
          )
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage steps" ON aloa_projectlet_steps
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_projectlet_steps
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View comments on accessible steps" ON aloa_projectlet_step_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM aloa_projectlet_steps s
      JOIN aloa_projectlets p ON p.id = s.projectlet_id
      WHERE s.id = aloa_projectlet_step_comments.step_id
        AND (
          is_project_member(p.project_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM aloa_project_stakeholders st
            WHERE st.project_id = p.project_id
              AND st.user_id = auth.uid()
          )
        )
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Project members can comment" ON aloa_projectlet_step_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM aloa_projectlet_steps s
      JOIN aloa_projectlets p ON p.id = s.projectlet_id
      WHERE s.id = aloa_projectlet_step_comments.step_id
        AND is_project_member(p.project_id, auth.uid())
    )
  );

CREATE POLICY "Service role bypass" ON aloa_projectlet_step_comments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

### Step 4.4: Fix aloa_project_phases
```sql
-- File: /supabase/security_fix_10_enable_project_phases_rls.sql
ALTER TABLE aloa_project_phases ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aloa_project_phases'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_project_phases', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "View phases in user projects" ON aloa_project_phases
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_phases.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage phases" ON aloa_project_phases
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_phases
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

### Step 4.5: Fix library and template tables
```sql
-- File: /supabase/security_fix_11_enable_library_templates_rls.sql
ALTER TABLE aloa_applet_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_insights ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_applet_library',
        'aloa_project_templates',
        'aloa_project_insights'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "Authenticated can view library" ON aloa_applet_library
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage library" ON aloa_applet_library
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_applet_library
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Authenticated can view templates" ON aloa_project_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage templates" ON aloa_project_templates
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_templates
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "View insights in user projects" ON aloa_project_insights
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_insights.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage insights" ON aloa_project_insights
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_insights
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
```

## Phase 5: Fix Knowledge Tables (Day 2 Afternoon)

### Step 5.1: Fix aloa_project_knowledge and related tables ✅ COMPLETED
```sql
-- File: /supabase/security_fix_12_enable_knowledge_rls.sql
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_form_responses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'aloa_project_knowledge',
        'aloa_knowledge_form_responses'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "View knowledge in user projects" ON aloa_project_knowledge
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_project_knowledge.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage knowledge" ON aloa_project_knowledge
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_project_knowledge
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  );

CREATE POLICY "View knowledge responses" ON aloa_knowledge_form_responses
  FOR SELECT TO authenticated
  USING (
    is_project_member(project_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM aloa_project_stakeholders s
      WHERE s.project_id = aloa_knowledge_form_responses.project_id
        AND s.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins manage knowledge responses" ON aloa_knowledge_form_responses
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role bypass" ON aloa_knowledge_form_responses
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  );
```

### Step 5.2: Fix aloa_knowledge_extraction_queue ✅ COMPLETED
```sql
-- File: /supabase/security_fix_13_enable_extraction_queue_rls.sql
ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aloa_knowledge_extraction_queue'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.aloa_knowledge_extraction_queue', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins view extraction queue" ON aloa_knowledge_extraction_queue
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role manage extraction queue" ON aloa_knowledge_extraction_queue
  FOR ALL
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
    OR current_user = 'service_role'
  );
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

## Phase 7: Update API Routes (Day 3 Morning)

### Step 7.1: Verify Service Client Usage
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

### Step 7.2: Update Error Handling
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

### Step 8.1: Create Test Script
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

- [x] Phase 1: Foundation Complete
  - [x] Step 1.0: Disable Self-Service Signups ✅
  - [x] Step 1.1: Create Test Users
  - [x] Step 1.2: Create Security Helper Functions ✅
- [x] Phase 2: User Tables Secured (aloa_user_profiles)
  - [x] Step 2.1: Fix aloa_user_profiles
  - [x] Step 2.2: Test User Profiles Security
- [x] Phase 3: Core Project Tables Secured
  - [x] aloa_projects (CRITICAL - has policies but RLS disabled!)
  - [x] aloa_project_members & stakeholders
- [x] Phase 4: Applet and Form Tables Secured
  - [x] aloa_applets, aloa_applet_progress
  - [x] aloa_forms, aloa_form_fields
  - [x] aloa_form_responses, aloa_form_response_answers
  - [x] aloa_projectlets, aloa_projectlet_steps, aloa_projectlet_step_comments
  - [x] aloa_project_phases
  - [x] aloa_applet_library, aloa_project_templates, aloa_project_insights
- [x] Phase 5: Knowledge Tables Secured
  - [x] aloa_project_knowledge
  - [x] aloa_knowledge_form_responses
  - [x] aloa_knowledge_extraction_queue
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
