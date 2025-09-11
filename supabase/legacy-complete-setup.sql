-- Complete Supabase Setup for Custom Forms
-- This SQL will create tables if they don't exist, or update them if they do

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create forms table if it doesn't exist
CREATE TABLE IF NOT EXISTS forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forms' AND column_name='title') THEN
    ALTER TABLE forms ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forms' AND column_name='description') THEN
    ALTER TABLE forms ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forms' AND column_name='url_id') THEN
    ALTER TABLE forms ADD COLUMN url_id TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forms' AND column_name='created_at') THEN
    ALTER TABLE forms ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forms' AND column_name='updated_at') THEN
    ALTER TABLE forms ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create form_fields table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  required BOOLEAN DEFAULT false,
  placeholder TEXT,
  options JSONB,
  validation JSONB,
  position INTEGER DEFAULT 0
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='form_id') THEN
    ALTER TABLE form_fields ADD COLUMN form_id UUID REFERENCES forms(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='label') THEN
    ALTER TABLE form_fields ADD COLUMN label TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='name') THEN
    ALTER TABLE form_fields ADD COLUMN name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='type') THEN
    ALTER TABLE form_fields ADD COLUMN type TEXT NOT NULL DEFAULT 'text';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='required') THEN
    ALTER TABLE form_fields ADD COLUMN required BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='placeholder') THEN
    ALTER TABLE form_fields ADD COLUMN placeholder TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='options') THEN
    ALTER TABLE form_fields ADD COLUMN options JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='validation') THEN
    ALTER TABLE form_fields ADD COLUMN validation JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_fields' AND column_name='position') THEN
    ALTER TABLE form_fields ADD COLUMN position INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create form_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_responses' AND column_name='form_id') THEN
    ALTER TABLE form_responses ADD COLUMN form_id UUID REFERENCES forms(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_responses' AND column_name='submitted_at') THEN
    ALTER TABLE form_responses ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create form_response_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_response_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE,
  field_id UUID REFERENCES form_fields(id) ON DELETE CASCADE,
  value JSONB
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_response_answers' AND column_name='response_id') THEN
    ALTER TABLE form_response_answers ADD COLUMN response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_response_answers' AND column_name='field_id') THEN
    ALTER TABLE form_response_answers ADD COLUMN field_id UUID REFERENCES form_fields(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_response_answers' AND column_name='value') THEN
    ALTER TABLE form_response_answers ADD COLUMN value JSONB;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_url_id ON forms(url_id);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_position ON form_fields(form_id, position);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_submitted_at ON form_responses(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_response_answers_response_id ON form_response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_form_response_answers_field_id ON form_response_answers(field_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_response_answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Forms are publicly accessible" ON forms;
DROP POLICY IF EXISTS "Form fields are publicly accessible" ON form_fields;
DROP POLICY IF EXISTS "Responses are publicly accessible" ON form_responses;
DROP POLICY IF EXISTS "Response answers are publicly accessible" ON form_response_answers;

-- Create public access policies (modify these for production security)
CREATE POLICY "Forms are publicly accessible" ON forms
  FOR ALL USING (true);

CREATE POLICY "Form fields are publicly accessible" ON form_fields
  FOR ALL USING (true);

CREATE POLICY "Responses are publicly accessible" ON form_responses
  FOR ALL USING (true);

CREATE POLICY "Response answers are publicly accessible" ON form_response_answers
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON forms TO anon, authenticated;
GRANT ALL ON form_fields TO anon, authenticated;
GRANT ALL ON form_responses TO anon, authenticated;
GRANT ALL ON form_response_answers TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  ✓ forms';
  RAISE NOTICE '  ✓ form_fields';
  RAISE NOTICE '  ✓ form_responses';
  RAISE NOTICE '  ✓ form_response_answers';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes created';
  RAISE NOTICE 'Row Level Security enabled';
  RAISE NOTICE 'Public policies applied';
  RAISE NOTICE '';
  RAISE NOTICE 'Your database is ready to use!';
END $$;