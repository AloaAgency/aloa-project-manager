-- Project Knowledge Base System
-- Stores and accumulates all project information for AI context

-- Add knowledge base fields to projects
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS existing_url TEXT,
ADD COLUMN IF NOT EXISTS google_drive_url TEXT,
ADD COLUMN IF NOT EXISTS base_knowledge JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_context TEXT,
ADD COLUMN IF NOT EXISTS knowledge_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create project knowledge documents table
CREATE TABLE IF NOT EXISTS aloa_project_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  -- Document details
  type TEXT NOT NULL CHECK (type IN ('url', 'file', 'text', 'form_response', 'note', 'copy', 'brand')),
  title TEXT NOT NULL,
  content TEXT, -- For text content
  file_url TEXT, -- For uploaded files
  external_url TEXT, -- For URLs
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  source TEXT, -- Where this came from (upload, form, manual, scrape)
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  
  -- AI processing
  processed BOOLEAN DEFAULT false,
  embeddings VECTOR(1536), -- For AI similarity search (if using pgvector)
  summary TEXT, -- AI-generated summary of this knowledge
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Create cumulative knowledge table (aggregated insights)
CREATE TABLE IF NOT EXISTS aloa_project_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  
  -- Insight details
  category TEXT NOT NULL, -- brand, design, content, technical, business
  insight TEXT NOT NULL,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Source tracking
  source_ids UUID[], -- References to aloa_project_knowledge entries
  derived_from TEXT, -- Description of how this was derived
  
  -- Status
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT
);

-- Create form responses archive for knowledge accumulation
CREATE TABLE IF NOT EXISTS aloa_knowledge_form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  
  -- Response data
  form_title TEXT,
  response_data JSONB NOT NULL,
  respondent_email TEXT,
  
  -- Processing
  processed_for_knowledge BOOLEAN DEFAULT false,
  extracted_insights JSONB,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_project_knowledge_project ON aloa_project_knowledge(project_id);
CREATE INDEX idx_project_knowledge_type ON aloa_project_knowledge(type);
CREATE INDEX idx_project_knowledge_processed ON aloa_project_knowledge(processed);
CREATE INDEX idx_project_insights_project ON aloa_project_insights(project_id);
CREATE INDEX idx_project_insights_category ON aloa_project_insights(category);
CREATE INDEX idx_knowledge_form_responses_project ON aloa_knowledge_form_responses(project_id);

-- Function to aggregate project knowledge into AI context
CREATE OR REPLACE FUNCTION update_project_ai_context(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_context TEXT;
  v_project RECORD;
  v_knowledge RECORD;
  v_insights TEXT;
BEGIN
  -- Get project basic info
  SELECT * INTO v_project FROM aloa_projects WHERE id = p_project_id;
  
  -- Start building context
  v_context := 'PROJECT CONTEXT FOR: ' || v_project.project_name || E'\n\n';
  v_context := v_context || 'CLIENT: ' || v_project.client_name || E'\n';
  
  IF v_project.existing_url IS NOT NULL THEN
    v_context := v_context || 'EXISTING WEBSITE: ' || v_project.existing_url || E'\n';
  END IF;
  
  -- Add base knowledge
  IF v_project.base_knowledge IS NOT NULL THEN
    v_context := v_context || E'\nBASE KNOWLEDGE:\n' || 
                 jsonb_pretty(v_project.base_knowledge) || E'\n';
  END IF;
  
  -- Add accumulated knowledge documents
  v_context := v_context || E'\nACCUMULATED KNOWLEDGE:\n';
  
  FOR v_knowledge IN 
    SELECT title, type, content, summary 
    FROM aloa_project_knowledge 
    WHERE project_id = p_project_id 
    ORDER BY importance DESC, created_at DESC 
    LIMIT 20
  LOOP
    v_context := v_context || '- [' || v_knowledge.type || '] ' || 
                 v_knowledge.title || ': ' || 
                 COALESCE(v_knowledge.summary, LEFT(v_knowledge.content, 200)) || E'\n';
  END LOOP;
  
  -- Add verified insights
  v_context := v_context || E'\nKEY INSIGHTS:\n';
  
  FOR v_knowledge IN 
    SELECT category, insight 
    FROM aloa_project_insights 
    WHERE project_id = p_project_id AND active = true
    ORDER BY confidence DESC 
    LIMIT 15
  LOOP
    v_context := v_context || '- [' || v_knowledge.category || '] ' || 
                 v_knowledge.insight || E'\n';
  END LOOP;
  
  -- Update the project with new context
  UPDATE aloa_projects 
  SET ai_context = v_context,
      knowledge_updated_at = NOW()
  WHERE id = p_project_id;
  
  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update AI context when knowledge changes
CREATE OR REPLACE FUNCTION trigger_update_ai_context()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_project_ai_context(NEW.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_context_on_knowledge_change
AFTER INSERT OR UPDATE ON aloa_project_knowledge
FOR EACH ROW
EXECUTE FUNCTION trigger_update_ai_context();

CREATE TRIGGER update_context_on_insight_change
AFTER INSERT OR UPDATE ON aloa_project_insights
FOR EACH ROW
EXECUTE FUNCTION trigger_update_ai_context();

-- Comments for documentation
COMMENT ON TABLE aloa_project_knowledge IS 'Stores all knowledge documents and information for a project';
COMMENT ON TABLE aloa_project_insights IS 'Stores derived insights and learnings from accumulated knowledge';
COMMENT ON TABLE aloa_knowledge_form_responses IS 'Archives form responses for knowledge extraction';
COMMENT ON FUNCTION update_project_ai_context IS 'Aggregates all project knowledge into a single AI context string';