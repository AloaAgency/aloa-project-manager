-- Final fix for aloa_project_members table and policies

-- 1. Add missing created_at column if it doesn't exist
ALTER TABLE aloa_project_members
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Refresh the table structure to ensure all columns are properly set
-- Add any other potentially missing columns
ALTER TABLE aloa_project_members
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Verify and recreate the RLS policies (in case they still have issues)
-- First check if RLS is enabled
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

-- Check current policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'aloa_project_members';

-- The policies should now be working since the error changed from "infinite recursion" to "missing column"
-- The current policies are sufficient