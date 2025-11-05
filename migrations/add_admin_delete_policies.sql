-- Add admin DELETE policies to child tables that are missing them
-- This allows CASCADE deletes to work properly when admins delete applets
-- Uses the existing is_admin() function for authorization

-- aloa_applet_completions: Add admin DELETE policy
DROP POLICY IF EXISTS "Admins can delete completions" ON aloa_applet_completions;
CREATE POLICY "Admins can delete completions"
ON aloa_applet_completions
FOR DELETE
USING (is_admin(auth.uid()));

-- aloa_applet_interactions: Add admin DELETE policy
DROP POLICY IF EXISTS "Admins can delete interactions" ON aloa_applet_interactions;
CREATE POLICY "Admins can delete interactions"
ON aloa_applet_interactions
FOR DELETE
USING (is_admin(auth.uid()));

-- Verify policies were created
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('aloa_applet_completions', 'aloa_applet_interactions')
AND cmd IN ('DELETE', 'ALL')
ORDER BY tablename, policyname;
