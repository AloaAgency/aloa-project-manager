-- File: /supabase/05_fix_projects.sql
-- CRITICAL: This table has policies created but RLS is NOT enabled!
-- This script enables RLS and ensures proper policies are in place

-- First, let's check current state and enable RLS
ALTER TABLE aloa_projects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "View projects" ON aloa_projects;
DROP POLICY IF EXISTS "View own projects" ON aloa_projects;
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
  FOR INSERT USING (is_admin(auth.uid()));

CREATE POLICY "Admins update projects" ON aloa_projects
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins delete projects" ON aloa_projects
  FOR DELETE USING (is_admin(auth.uid()));

-- Service role bypass for API operations
CREATE POLICY "Service role bypass" ON aloa_projects
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on aloa_projects table with proper policies';
END $$;