-- First, check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'aloa_client_stakeholders'
) AS table_exists;

-- If you see false above, run the CREATE TABLE below
-- If you see true, the table exists and we need to check permissions

-- Drop the table if it exists (only if you want to recreate it)
-- DROP TABLE IF EXISTS aloa_client_stakeholders CASCADE;

-- Create the table
CREATE TABLE IF NOT EXISTS public.aloa_client_stakeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  role VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT,
  responsibilities TEXT,
  preferences TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  is_primary BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_project_id 
ON public.aloa_client_stakeholders(project_id);

CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_importance 
ON public.aloa_client_stakeholders(project_id, importance DESC);

CREATE INDEX IF NOT EXISTS idx_aloa_client_stakeholders_is_primary 
ON public.aloa_client_stakeholders(project_id, is_primary);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_aloa_client_stakeholders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_aloa_client_stakeholders_updated_at ON public.aloa_client_stakeholders;

CREATE TRIGGER trigger_update_aloa_client_stakeholders_updated_at
BEFORE UPDATE ON public.aloa_client_stakeholders
FOR EACH ROW
EXECUTE FUNCTION update_aloa_client_stakeholders_updated_at();

-- Add comment
COMMENT ON TABLE public.aloa_client_stakeholders IS 'Stores client stakeholder information for projects';

-- Grant permissions (important for Supabase)
GRANT ALL ON public.aloa_client_stakeholders TO postgres;
GRANT ALL ON public.aloa_client_stakeholders TO anon;
GRANT ALL ON public.aloa_client_stakeholders TO authenticated;
GRANT ALL ON public.aloa_client_stakeholders TO service_role;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.aloa_client_stakeholders ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (adjust as needed)
CREATE POLICY "Enable all operations for authenticated users" ON public.aloa_client_stakeholders
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the table was created
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'aloa_client_stakeholders';

-- Check if there are any rows (including your test data)
SELECT COUNT(*) as stakeholder_count FROM public.aloa_client_stakeholders;

-- Show the test stakeholder if it exists
SELECT * FROM public.aloa_client_stakeholders WHERE name ILIKE '%ross palmer%';