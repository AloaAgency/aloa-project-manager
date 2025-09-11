-- Create project_files table for tracking files stored in Supabase Storage
CREATE TABLE IF NOT EXISTS project_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE CASCADE,
  applet_id UUID REFERENCES aloa_applets(id) ON DELETE CASCADE,
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  
  -- Access control
  category TEXT NOT NULL DEFAULT 'general', -- 'final-deliverables', 'work-in-progress', 'client-upload', 'general'
  is_public BOOLEAN DEFAULT false,
  requires_auth BOOLEAN DEFAULT true,
  
  -- Tracking
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  
  -- Version control
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  previous_version_id UUID REFERENCES project_files(id),
  
  -- Additional metadata
  description TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_category ON project_files(category);
CREATE INDEX idx_project_files_is_latest ON project_files(is_latest);
CREATE INDEX idx_project_files_storage_path ON project_files(storage_path);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_project_files_updated_at
BEFORE UPDATE ON project_files
FOR EACH ROW
EXECUTE FUNCTION update_project_files_updated_at();

-- Create RLS policies
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all files" ON project_files
FOR ALL USING (true)
WITH CHECK (true);

-- Policy: Project members can view their project files
CREATE POLICY "Project members can view files" ON project_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM aloa_projects
    WHERE id = project_files.project_id
    -- Add your user authentication check here
  )
);

-- Add comment to table
COMMENT ON TABLE project_files IS 'Tracks files uploaded to Supabase Storage for projects';
COMMENT ON COLUMN project_files.category IS 'File category: final-deliverables, work-in-progress, client-upload, general';
COMMENT ON COLUMN project_files.storage_path IS 'Full path in Supabase Storage bucket';