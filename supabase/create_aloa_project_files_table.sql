-- Create aloa_project_files table for unified file management
CREATE TABLE IF NOT EXISTS aloa_project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE SET NULL,
    applet_id UUID, -- Will be used later when applets table exists

    -- File metadata
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    description TEXT,
    category TEXT DEFAULT 'general', -- 'general', 'work-in-progress', 'final-deliverables'
    tags TEXT[] DEFAULT '{}',

    -- Storage information
    storage_path TEXT, -- Path in Supabase Storage
    storage_type TEXT DEFAULT 'supabase', -- 'supabase', 'base64', 'external'
    url TEXT, -- Public URL if available

    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    requires_auth BOOLEAN DEFAULT TRUE,

    -- Upload information
    uploaded_by TEXT, -- 'admin', 'client', 'team_member'
    uploaded_by_id UUID,

    -- Tracking
    download_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    last_downloaded_at TIMESTAMPTZ,

    -- Version control
    version INTEGER DEFAULT 1,
    is_latest BOOLEAN DEFAULT TRUE,
    parent_file_id UUID REFERENCES aloa_project_files(id),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_project ON aloa_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_projectlet ON aloa_project_files(projectlet_id);
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_category ON aloa_project_files(category);
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_uploaded_by ON aloa_project_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_is_visible ON aloa_project_files(is_visible);
CREATE INDEX IF NOT EXISTS idx_aloa_project_files_created ON aloa_project_files(created_at DESC);

-- Enable Row Level Security
ALTER TABLE aloa_project_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow service role full access
CREATE POLICY "Service role has full access to project files"
    ON aloa_project_files
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read files for their projects
CREATE POLICY "Users can read files for their projects"
    ON aloa_project_files
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id
            FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    );

-- Allow project admins to manage files
CREATE POLICY "Project admins can manage files"
    ON aloa_project_files
    FOR ALL
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id
            FROM aloa_project_members
            WHERE user_id = auth.uid()
            AND project_role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT project_id
            FROM aloa_project_members
            WHERE user_id = auth.uid()
            AND project_role IN ('admin', 'owner')
        )
    );

-- Allow clients to upload files if permitted
CREATE POLICY "Clients can upload files when permitted"
    ON aloa_project_files
    FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT project_id
            FROM aloa_project_members
            WHERE user_id = auth.uid()
            AND project_role = 'viewer'
        )
        AND uploaded_by = 'client'
    );

-- Allow clients to delete their own files
CREATE POLICY "Clients can delete their own files"
    ON aloa_project_files
    FOR DELETE
    TO authenticated
    USING (
        uploaded_by_id = auth.uid()
        AND uploaded_by = 'client'
    );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_aloa_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER aloa_project_files_updated_at
    BEFORE UPDATE ON aloa_project_files
    FOR EACH ROW
    EXECUTE FUNCTION update_aloa_project_files_updated_at();

-- Storage bucket setup
-- Note: The application uses the existing 'project-files' bucket
-- Make sure this bucket exists in your Supabase Dashboard
-- with public access disabled

-- Sample insert for testing (optional - comment out in production)
/*
INSERT INTO aloa_project_files (
    project_id,
    file_name,
    file_size,
    file_type,
    category,
    uploaded_by,
    description
) VALUES (
    (SELECT id FROM aloa_projects LIMIT 1),
    'sample-document.pdf',
    1024000,
    'application/pdf',
    'general',
    'admin',
    'Sample project document'
);
*/

-- Grant permissions (simplified to avoid column-specific grants)
GRANT ALL ON aloa_project_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON aloa_project_files TO authenticated;

-- Add comments for documentation (only if table was created successfully)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aloa_project_files') THEN
        COMMENT ON TABLE aloa_project_files IS 'Unified file management for projects, supporting both admin and client uploads with full sync';
        COMMENT ON COLUMN aloa_project_files.category IS 'File category: general, work-in-progress, or final-deliverables';
        COMMENT ON COLUMN aloa_project_files.storage_type IS 'Storage method: supabase (Storage), base64 (in DB), or external (URL)';
        COMMENT ON COLUMN aloa_project_files.uploaded_by IS 'User role that uploaded the file: admin, client, or team_member';
    END IF;
END $$;