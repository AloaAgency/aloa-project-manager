-- =====================================================
-- SEPARATION OF FORMS SYSTEMS - RUN THIS NOW
-- =====================================================
-- This script creates the aloa_forms tables that are completely
-- separate from the legacy forms system. Run this to complete
-- the separation between the two applications.

-- =====================================================
-- ALOA FORMS SYSTEM (Separate from legacy)
-- =====================================================

-- 1. Create aloa_forms table (separate from legacy forms)
CREATE TABLE IF NOT EXISTS aloa_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url_id TEXT UNIQUE NOT NULL,
  markdown_content TEXT,
  aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create aloa_form_fields table
CREATE TABLE IF NOT EXISTS aloa_form_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  placeholder TEXT,
  options JSONB,
  validation JSONB,
  field_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create aloa_form_responses table
CREATE TABLE IF NOT EXISTS aloa_form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aloa_form_id UUID REFERENCES aloa_forms(id) ON DELETE CASCADE,
  aloa_project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_aloa_forms_project ON aloa_forms(aloa_project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_forms_url ON aloa_forms(url_id);
CREATE INDEX IF NOT EXISTS idx_aloa_forms_status ON aloa_forms(status);

CREATE INDEX IF NOT EXISTS idx_aloa_form_fields_form ON aloa_form_fields(aloa_form_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_fields_order ON aloa_form_fields(aloa_form_id, field_order);

CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_form ON aloa_form_responses(aloa_form_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_project ON aloa_form_responses(aloa_project_id);
CREATE INDEX IF NOT EXISTS idx_aloa_form_responses_submitted ON aloa_form_responses(submitted_at DESC);

-- =====================================================
-- PERMISSIONS
-- =====================================================

GRANT ALL ON aloa_forms TO authenticated;
GRANT ALL ON aloa_form_fields TO authenticated;
GRANT ALL ON aloa_form_responses TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this script, you should have:
-- ✅ aloa_forms table (completely separate from legacy forms)
-- ✅ aloa_form_fields table
-- ✅ aloa_form_responses table
-- ✅ All necessary indexes
-- ✅ Proper permissions

-- The legacy 'forms' table remains untouched and the two systems
-- are now completely separate.