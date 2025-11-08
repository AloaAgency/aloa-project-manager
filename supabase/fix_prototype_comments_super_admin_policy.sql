-- Fix: Allow Super Admins to create comments on prototype reviews
-- Issue: Super Admins were blocked from adding comments due to restrictive INSERT policy

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create comments on their project prototypes" ON aloa_prototype_comments;

-- Recreate with Super Admin bypass
CREATE POLICY "Users can create comments on their project prototypes"
ON aloa_prototype_comments FOR INSERT
WITH CHECK (
  -- Super Admins and Project Admins can always create comments
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin')
  )
  OR
  -- Other users need to be stakeholders or members of the project
  (
    aloa_project_id IN (
      SELECT project_id FROM aloa_project_stakeholders
      WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM aloa_project_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'aloa_prototype_comments'
AND policyname = 'Users can create comments on their project prototypes';
