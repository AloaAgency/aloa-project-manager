-- Fix missing columns in knowledge-related tables
-- Run this to fix the "importance does not exist" error

-- 1. Check if aloa_client_stakeholders table exists and has importance_score column
DO $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_client_stakeholders'
  ) THEN
    -- Add importance_score column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'aloa_client_stakeholders'
      AND column_name = 'importance_score'
    ) THEN
      ALTER TABLE aloa_client_stakeholders
      ADD COLUMN importance_score INTEGER DEFAULT 5;
    END IF;
  END IF;
END $$;

-- 2. Check if aloa_project_insights table exists and has required columns
DO $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_project_insights'
  ) THEN
    -- Add confidence column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'aloa_project_insights'
      AND column_name = 'confidence'
    ) THEN
      ALTER TABLE aloa_project_insights
      ADD COLUMN confidence DECIMAL(3,2) DEFAULT 0.5;
    END IF;

    -- Add active column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'aloa_project_insights'
      AND column_name = 'active'
    ) THEN
      ALTER TABLE aloa_project_insights
      ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE aloa_project_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
      insight_type TEXT,
      content TEXT,
      confidence DECIMAL(3,2) DEFAULT 0.5,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create index
    CREATE INDEX idx_project_insights_project ON aloa_project_insights(project_id);
  END IF;
END $$;

-- 3. Also create aloa_client_stakeholders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'aloa_client_stakeholders'
  ) THEN
    CREATE TABLE aloa_client_stakeholders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      role TEXT,
      importance_score INTEGER DEFAULT 5,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create index
    CREATE INDEX idx_client_stakeholders_project ON aloa_client_stakeholders(project_id);
  END IF;
END $$;

-- 4. Verify the columns now exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('aloa_client_stakeholders', 'aloa_project_insights', 'aloa_project_knowledge')
  AND column_name IN ('importance_score', 'confidence', 'active')
ORDER BY table_name, column_name;