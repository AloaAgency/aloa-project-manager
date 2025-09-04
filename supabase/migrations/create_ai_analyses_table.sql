-- Create table for storing AI analyses
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_ai_analyses_form_id ON ai_analyses(form_id);
CREATE INDEX idx_ai_analyses_created_at ON ai_analyses(created_at DESC);

-- Add RLS policies
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Enable all operations for authenticated users" ON ai_analyses
  FOR ALL USING (true);