-- ===============================================
-- PROJECT KNOWLEDGE SYSTEM (FIXED)
-- ===============================================
-- This system centralizes all project information for AI agents to have complete context
-- about client preferences, responses, documents, and existing website content

-- Drop existing objects if they exist to ensure clean installation
DROP TABLE IF EXISTS aloa_knowledge_relationships CASCADE;
DROP TABLE IF EXISTS aloa_knowledge_extraction_queue CASCADE;
DROP TABLE IF EXISTS aloa_ai_context_cache CASCADE;
DROP TABLE IF EXISTS aloa_project_knowledge CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS extract_knowledge_from_form_response() CASCADE;
DROP FUNCTION IF EXISTS extract_knowledge_from_file_upload() CASCADE;
DROP FUNCTION IF EXISTS build_ai_context(UUID, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS search_project_knowledge(UUID, TEXT, TEXT[], INTEGER) CASCADE;

-- 1. Main knowledge store table
CREATE TABLE aloa_project_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN (
    'form_response',      -- Client form responses
    'file_document',      -- Text from uploaded documents
    'website_content',    -- Scraped website content
    'applet_interaction', -- Interactions with applets (palette choices, etc.)
    'client_feedback',    -- Direct client feedback/comments
    'project_brief',      -- Initial project brief
    'team_notes'         -- Internal team notes marked as relevant
  )),
  source_id TEXT,        -- ID of the source (form_id, file_id, applet_id, etc.)
  source_name TEXT,      -- Human-readable source name
  source_url TEXT,       -- URL if applicable (website, file URL, etc.)

  -- Content and metadata
  content_type TEXT NOT NULL CHECK (content_type IN (
    'text',              -- Plain text content
    'structured_data',   -- JSON structured data
    'preferences',       -- Client preferences/choices
    'requirements'       -- Project requirements
  )),
  content TEXT NOT NULL,           -- The actual content (text or JSON)
  content_summary TEXT,            -- AI-generated summary of content
  -- Note: content_embeddings commented out as it requires pgvector extension
  -- content_embeddings vector(1536), -- Optional: OpenAI embeddings for semantic search

  -- Categorization
  category TEXT CHECK (category IN (
    'brand_identity',    -- Brand colors, logos, tone
    'design_preferences', -- UI/UX preferences
    'content_strategy',  -- Content preferences, tone of voice
    'functionality',     -- Feature requirements
    'target_audience',   -- User personas, demographics
    'business_goals',    -- KPIs, objectives
    'technical_specs',   -- Technical requirements
    'feedback',         -- Client feedback and revisions
    'inspiration'       -- Reference sites, examples
  )),
  tags TEXT[],         -- Additional tags for filtering

  -- Importance and relevance
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  is_current BOOLEAN DEFAULT true, -- False if superseded by newer information
  superseded_by UUID REFERENCES aloa_project_knowledge(id),

  -- Extraction metadata
  extracted_by TEXT,   -- 'system', 'ai', 'manual'
  extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Knowledge relationships table (link related knowledge pieces)
CREATE TABLE aloa_knowledge_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_id_a UUID NOT NULL REFERENCES aloa_project_knowledge(id) ON DELETE CASCADE,
  knowledge_id_b UUID NOT NULL REFERENCES aloa_project_knowledge(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'contradicts',      -- Information conflicts
    'supersedes',       -- A replaces B
    'elaborates',       -- A provides more detail on B
    'relates_to',       -- General relationship
    'depends_on'        -- A depends on B
  )),
  confidence DECIMAL(3,2) DEFAULT 1.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(knowledge_id_a, knowledge_id_b, relationship_type)
);

-- 3. Knowledge extraction queue (for processing documents/websites)
CREATE TABLE aloa_knowledge_extraction_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AI context cache (pre-built contexts for common queries)
CREATE TABLE aloa_ai_context_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN (
    'full_project',     -- Complete project context
    'design_brief',     -- Design-specific context
    'content_brief',    -- Content-specific context
    'technical_brief',  -- Technical specifications
    'brand_guide'       -- Brand guidelines
  )),
  context_data JSONB NOT NULL, -- Structured context ready for AI
  token_count INTEGER,          -- Estimated token count
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, context_type)
);

-- 5. Create indexes for performance
CREATE INDEX idx_project_knowledge_project_id ON aloa_project_knowledge(project_id);
CREATE INDEX idx_project_knowledge_source_type ON aloa_project_knowledge(source_type);
CREATE INDEX idx_project_knowledge_category ON aloa_project_knowledge(category);
CREATE INDEX idx_project_knowledge_is_current ON aloa_project_knowledge(is_current);
CREATE INDEX idx_project_knowledge_importance ON aloa_project_knowledge(importance_score DESC);
CREATE INDEX idx_knowledge_extraction_queue_status ON aloa_knowledge_extraction_queue(status, priority DESC);
CREATE INDEX idx_ai_context_cache_project_type ON aloa_ai_context_cache(project_id, context_type);

-- 6. Create triggers for updated_at (only if function doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_aloa_project_knowledge_updated_at
  BEFORE UPDATE ON aloa_project_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aloa_ai_context_cache_updated_at
  BEFORE UPDATE ON aloa_ai_context_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Function to extract knowledge from form responses
CREATE OR REPLACE FUNCTION extract_knowledge_from_form_response()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new form response is created, queue it for knowledge extraction
  -- Check if aloa_applet_responses table exists before inserting
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_applet_responses'
  ) THEN
    INSERT INTO aloa_knowledge_extraction_queue (
      project_id,
      source_type,
      source_id,
      priority,
      status
    )
    SELECT
      ar.project_id,
      'form_response',
      NEW.id::TEXT,
      CASE
        WHEN af.name ILIKE '%brand%' OR af.name ILIKE '%identity%' THEN 9
        WHEN af.name ILIKE '%requirement%' OR af.name ILIKE '%brief%' THEN 8
        ELSE 5
      END,
      'pending'
    FROM aloa_applet_responses ar
    JOIN aloa_forms af ON ar.form_id = af.id
    WHERE ar.id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to extract knowledge from uploaded files
CREATE OR REPLACE FUNCTION extract_knowledge_from_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- When a text-based file is uploaded, queue it for knowledge extraction
  IF NEW.mime_type IN ('text/plain', 'application/pdf', 'text/markdown', 'text/html',
                       'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') THEN
    INSERT INTO aloa_knowledge_extraction_queue (
      project_id,
      source_type,
      source_id,
      source_url,
      priority,
      status
    )
    VALUES (
      NEW.project_id,
      'file_document',
      NEW.id::TEXT,
      NEW.file_url,
      6,
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers for automatic knowledge extraction (only if tables exist)
DO $$
BEGIN
  -- Only create trigger if aloa_applet_responses exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_applet_responses'
  ) THEN
    CREATE TRIGGER trigger_extract_knowledge_from_form_response
      AFTER INSERT ON aloa_applet_responses
      FOR EACH ROW
      EXECUTE FUNCTION extract_knowledge_from_form_response();
  END IF;

  -- Only create trigger if aloa_project_files exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_project_files'
  ) THEN
    CREATE TRIGGER trigger_extract_knowledge_from_file_upload
      AFTER INSERT ON aloa_project_files
      FOR EACH ROW
      EXECUTE FUNCTION extract_knowledge_from_file_upload();
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Triggers already exist, skip
    NULL;
END $$;

-- 10. Function to build AI context from knowledge base
CREATE OR REPLACE FUNCTION build_ai_context(
  p_project_id UUID,
  p_context_type TEXT DEFAULT 'full_project',
  p_categories TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
  v_knowledge_items JSONB;
  v_project_info JSONB;
BEGIN
  -- Get project information
  SELECT to_jsonb(p.*) INTO v_project_info
  FROM aloa_projects p
  WHERE p.id = p_project_id;

  -- Get relevant knowledge items
  SELECT jsonb_agg(
    jsonb_build_object(
      'source', k.source_name,
      'type', k.source_type,
      'category', k.category,
      'content', k.content,
      'summary', k.content_summary,
      'importance', k.importance_score,
      'extracted_at', k.processed_at
    ) ORDER BY k.importance_score DESC, k.created_at DESC
  ) INTO v_knowledge_items
  FROM aloa_project_knowledge k
  WHERE k.project_id = p_project_id
    AND k.is_current = true
    AND (p_categories IS NULL OR k.category = ANY(p_categories))
  LIMIT 50; -- Limit to top 50 most important/recent items

  -- Build the context object
  v_context := jsonb_build_object(
    'project', v_project_info,
    'knowledge_items', COALESCE(v_knowledge_items, '[]'::jsonb),
    'context_type', p_context_type,
    'generated_at', NOW(),
    'item_count', jsonb_array_length(COALESCE(v_knowledge_items, '[]'::jsonb))
  );

  -- Cache the context for reuse
  INSERT INTO aloa_ai_context_cache (
    project_id,
    context_type,
    context_data,
    expires_at
  ) VALUES (
    p_project_id,
    p_context_type,
    v_context,
    NOW() + INTERVAL '1 hour'
  )
  ON CONFLICT (project_id, context_type)
  DO UPDATE SET
    context_data = v_context,
    expires_at = NOW() + INTERVAL '1 hour',
    updated_at = NOW();

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

-- 11. Function to search knowledge base (without pg_trgm dependency)
CREATE OR REPLACE FUNCTION search_project_knowledge(
  p_project_id UUID,
  p_search_terms TEXT,
  p_categories TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source_name TEXT,
  source_type TEXT,
  category TEXT,
  content TEXT,
  content_summary TEXT,
  importance_score INTEGER,
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.source_name,
    k.source_type,
    k.category,
    k.content,
    k.content_summary,
    k.importance_score,
    -- Simple relevance scoring based on ILIKE match
    CASE
      WHEN k.content ILIKE '%' || p_search_terms || '%' THEN 1.0
      WHEN k.content_summary ILIKE '%' || p_search_terms || '%' THEN 0.8
      WHEN k.source_name ILIKE '%' || p_search_terms || '%' THEN 0.6
      ELSE 0.5
    END AS relevance_score
  FROM aloa_project_knowledge k
  WHERE k.project_id = p_project_id
    AND k.is_current = true
    AND (p_categories IS NULL OR k.category = ANY(p_categories))
    AND (
      k.content ILIKE '%' || p_search_terms || '%'
      OR k.content_summary ILIKE '%' || p_search_terms || '%'
      OR k.source_name ILIKE '%' || p_search_terms || '%'
    )
  ORDER BY
    relevance_score DESC,
    k.importance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 12. Enable Row Level Security
ALTER TABLE aloa_project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_knowledge_extraction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_ai_context_cache ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Project members can read knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Service role can manage knowledge" ON aloa_project_knowledge;
DROP POLICY IF EXISTS "Service role can manage relationships" ON aloa_knowledge_relationships;
DROP POLICY IF EXISTS "Service role can manage extraction queue" ON aloa_knowledge_extraction_queue;
DROP POLICY IF EXISTS "Service role can manage context cache" ON aloa_ai_context_cache;

-- Knowledge is readable by project members
CREATE POLICY "Project members can read knowledge" ON aloa_project_knowledge
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM aloa_project_members pm
      WHERE pm.project_id = aloa_project_knowledge.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Service role can manage all knowledge
CREATE POLICY "Service role can manage knowledge" ON aloa_project_knowledge
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Similar policies for other tables
CREATE POLICY "Service role can manage relationships" ON aloa_knowledge_relationships
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage extraction queue" ON aloa_knowledge_extraction_queue
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage context cache" ON aloa_ai_context_cache
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- 14. Grant permissions
GRANT ALL ON aloa_project_knowledge TO service_role;
GRANT ALL ON aloa_knowledge_relationships TO service_role;
GRANT ALL ON aloa_knowledge_extraction_queue TO service_role;
GRANT ALL ON aloa_ai_context_cache TO service_role;
GRANT SELECT ON aloa_project_knowledge TO authenticated;

-- 15. Add comment explaining the system
COMMENT ON TABLE aloa_project_knowledge IS 'Central knowledge base for AI agents containing all project-related information including client responses, documents, and website content';
COMMENT ON TABLE aloa_knowledge_extraction_queue IS 'Queue for processing and extracting knowledge from various sources';
COMMENT ON TABLE aloa_ai_context_cache IS 'Pre-built AI contexts for improved performance';
COMMENT ON FUNCTION build_ai_context IS 'Builds a comprehensive AI context from the project knowledge base';
COMMENT ON FUNCTION search_project_knowledge IS 'Search the project knowledge base with relevance scoring';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Project Knowledge System installed successfully!';
END $$;