-- Add applet completion tracking table
CREATE TABLE IF NOT EXISTS aloa_applet_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    applet_id UUID NOT NULL REFERENCES aloa_applets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique completion per user per applet
    UNIQUE(applet_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_applet_completions_project_id ON aloa_applet_completions(project_id);
CREATE INDEX idx_applet_completions_applet_id ON aloa_applet_completions(applet_id);
CREATE INDEX idx_applet_completions_user_id ON aloa_applet_completions(user_id);

-- Add avatar_url to user profiles if not exists
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add function to calculate applet completion percentage
CREATE OR REPLACE FUNCTION get_applet_completion_percentage(p_applet_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_stakeholders INTEGER;
    completed_count INTEGER;
    percentage INTEGER;
BEGIN
    -- Get total stakeholders for the project
    SELECT COUNT(DISTINCT cs.user_id)
    INTO total_stakeholders
    FROM aloa_applets a
    JOIN aloa_projectlets p ON a.projectlet_id = p.id
    JOIN aloa_client_stakeholders cs ON cs.project_id = p.project_id
    WHERE a.id = p_applet_id
    AND cs.user_id IS NOT NULL;
    
    -- If no stakeholders with users, return 0
    IF total_stakeholders = 0 THEN
        RETURN 0;
    END IF;
    
    -- Get count of stakeholders who completed this applet
    SELECT COUNT(DISTINCT ac.user_id)
    INTO completed_count
    FROM aloa_applet_completions ac
    WHERE ac.applet_id = p_applet_id;
    
    -- Calculate percentage
    percentage := ROUND((completed_count::NUMERIC / total_stakeholders::NUMERIC) * 100);
    
    RETURN percentage;
END;
$$ LANGUAGE plpgsql;

-- Add function to get users who completed an applet
CREATE OR REPLACE FUNCTION get_applet_completed_users(p_applet_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        up.full_name,
        up.avatar_url,
        ac.completed_at
    FROM aloa_applet_completions ac
    JOIN auth.users u ON ac.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.id
    WHERE ac.applet_id = p_applet_id
    ORDER BY ac.completed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on the new table
ALTER TABLE aloa_applet_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own completions" ON aloa_applet_completions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all completions in their projects" ON aloa_applet_completions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM aloa_project_team pt
            WHERE pt.project_id = aloa_applet_completions.project_id
            AND pt.user_id = auth.uid()
            AND pt.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can insert their own completions" ON aloa_applet_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions" ON aloa_applet_completions
    FOR UPDATE
    USING (auth.uid() = user_id);