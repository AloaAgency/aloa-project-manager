-- Create the aloa_applet_interactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS aloa_applet_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    applet_id UUID NOT NULL REFERENCES aloa_applets(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL DEFAULT 'anonymous',
    interaction_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applet_interactions_applet ON aloa_applet_interactions(applet_id);
CREATE INDEX IF NOT EXISTS idx_applet_interactions_user ON aloa_applet_interactions(user_email);
CREATE INDEX IF NOT EXISTS idx_applet_interactions_type ON aloa_applet_interactions(interaction_type);

-- Enable RLS
ALTER TABLE aloa_applet_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Enable read for all users" ON aloa_applet_interactions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON aloa_applet_interactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON aloa_applet_interactions
    FOR UPDATE USING (true);