-- Create knowledge extraction queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS aloa_knowledge_extraction_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_url TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE(project_id, source_type, source_id)
);

-- Create index for efficient processing
CREATE INDEX IF NOT EXISTS idx_knowledge_extraction_queue_status
    ON aloa_knowledge_extraction_queue(status, priority DESC, created_at);

-- Grant permissions
GRANT ALL ON aloa_knowledge_extraction_queue TO authenticated;
GRANT ALL ON aloa_knowledge_extraction_queue TO service_role;