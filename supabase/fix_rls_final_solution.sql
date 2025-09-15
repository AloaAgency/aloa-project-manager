-- Final solution for RLS policies on aloa_project_members
-- This completely removes all policies and creates a simple, working set

-- 1. First, ensure the table has all required columns
ALTER TABLE aloa_project_members
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Disable RLS temporarily to clean up
ALTER TABLE aloa_project_members DISABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'aloa_project_members'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON aloa_project_members', pol.policyname);
    END LOOP;
END $$;

-- 4. Re-enable RLS
ALTER TABLE aloa_project_members ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, working policies
-- IMPORTANT: We're using a very permissive approach that avoids recursion

-- Policy 1: All authenticated users can view all project members
CREATE POLICY "authenticated_view_members"
ON aloa_project_members
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Users with admin roles can insert new members
-- This avoids recursion by checking the user's role directly
CREATE POLICY "admins_insert_members"
ON aloa_project_members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM aloa_user_profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- Policy 3: Users with admin roles can update members
CREATE POLICY "admins_update_members"
ON aloa_project_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM aloa_user_profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'project_admin', 'team_member')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM aloa_user_profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- Policy 4: Users with admin roles can delete members
CREATE POLICY "admins_delete_members"
ON aloa_project_members
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM aloa_user_profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON aloa_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON aloa_project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_role ON aloa_project_members(project_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON aloa_user_profiles(role);

-- 7. Verify the policies were created correctly
SELECT
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'aloa_project_members'
ORDER BY policyname;

-- 8. Test query to verify you can see the table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'aloa_project_members'
ORDER BY ordinal_position;