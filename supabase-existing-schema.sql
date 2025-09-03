-- This SQL assumes you already have the basic tables created
-- Just adds any missing columns or modifications needed

-- Ensure forms table has all needed columns
ALTER TABLE forms ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS url_id TEXT UNIQUE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE forms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure form_fields table has all needed columns  
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT false;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS placeholder TEXT;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS validation JSONB;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General Information';

-- Ensure form_responses table has all needed columns
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE CASCADE;
ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure form_response_answers table has all needed columns
ALTER TABLE form_response_answers ADD COLUMN IF NOT EXISTS response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE;
ALTER TABLE form_response_answers ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES form_fields(id) ON DELETE CASCADE;
ALTER TABLE form_response_answers ADD COLUMN IF NOT EXISTS value JSONB;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_forms_url_id ON forms(url_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_position ON form_fields(position);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_response_answers_response_id ON form_response_answers(response_id);

-- Create update trigger function if needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if not exists
DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS if not already enabled
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_response_answers ENABLE ROW LEVEL SECURITY;

-- Create basic public access policies (modify as needed for your security requirements)
DROP POLICY IF EXISTS "Forms are publicly accessible" ON forms;
CREATE POLICY "Forms are publicly accessible" ON forms FOR ALL USING (true);

DROP POLICY IF EXISTS "Form fields are publicly accessible" ON form_fields;
CREATE POLICY "Form fields are publicly accessible" ON form_fields FOR ALL USING (true);

DROP POLICY IF EXISTS "Responses are publicly accessible" ON form_responses;
CREATE POLICY "Responses are publicly accessible" ON form_responses FOR ALL USING (true);

DROP POLICY IF EXISTS "Response answers are publicly accessible" ON form_response_answers;
CREATE POLICY "Response answers are publicly accessible" ON form_response_answers FOR ALL USING (true);