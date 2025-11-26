-- Writing Style System for Project-Specific AI Voice
-- Run this in your Supabase SQL Editor

-- Table to store writing samples uploaded by project admins
CREATE TABLE IF NOT EXISTS aloa_project_writing_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,

    -- File info
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'text/plain', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    file_size INTEGER,
    storage_path TEXT, -- Path in Supabase storage if applicable

    -- Extracted content
    extracted_text TEXT, -- Full text extracted from the document
    word_count INTEGER,

    -- Metadata
    description TEXT, -- Optional admin description of what this sample represents
    sample_type TEXT DEFAULT 'general', -- 'general', 'social_media', 'email', 'blog', 'formal', 'casual'

    -- Upload info
    uploaded_by UUID REFERENCES aloa_user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Table to store the AI-generated (and admin-editable) style summary
CREATE TABLE IF NOT EXISTS aloa_project_writing_style (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,

    -- AI-generated style analysis (editable by admin)
    style_summary TEXT, -- Overall summary of the writing style

    -- Detailed style attributes (JSON for flexibility)
    style_attributes JSONB DEFAULT '{}'::jsonb,
    -- Expected structure:
    -- {
    --   "tone": "professional yet approachable",
    --   "vocabulary_level": "accessible, avoids jargon",
    --   "sentence_structure": "varied, mix of short and long",
    --   "formatting_preferences": "uses bullet points, headers",
    --   "voice": "first person plural (we/our)",
    --   "key_phrases": ["leverage", "partner with", "drive results"],
    --   "avoid_phrases": ["synergy", "circle back"],
    --   "paragraph_length": "short, 2-3 sentences",
    --   "punctuation_style": "oxford comma, minimal exclamation marks",
    --   "emoji_usage": "none/minimal/moderate/frequent"
    -- }

    -- Quick reference fields (extracted from style_attributes for easy access)
    tone_keywords TEXT[], -- e.g., ['professional', 'friendly', 'authoritative']
    voice_perspective TEXT, -- 'first_person_singular', 'first_person_plural', 'third_person'
    formality_level TEXT, -- 'very_formal', 'formal', 'neutral', 'casual', 'very_casual'

    -- Admin overrides/additions
    admin_notes TEXT, -- Additional style notes from admin
    do_not_use TEXT[], -- Phrases/words to never use
    always_use TEXT[], -- Phrases/words to always prefer

    -- Analysis metadata
    last_analyzed_at TIMESTAMPTZ,
    samples_analyzed INTEGER DEFAULT 0,
    analysis_confidence DECIMAL(3,2), -- 0.00 to 1.00

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One style per project
    UNIQUE(project_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_writing_samples_project ON aloa_project_writing_samples(project_id);
CREATE INDEX IF NOT EXISTS idx_writing_samples_active ON aloa_project_writing_samples(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_writing_style_project ON aloa_project_writing_style(project_id);

-- Enable RLS
ALTER TABLE aloa_project_writing_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_project_writing_style ENABLE ROW LEVEL SECURITY;

-- RLS Policies for writing samples
CREATE POLICY "Super admins can do everything with writing samples"
    ON aloa_project_writing_samples
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Project admins can manage their project writing samples"
    ON aloa_project_writing_samples
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles
            WHERE id = auth.uid() AND role = 'project_admin'
        )
        AND
        EXISTS (
            SELECT 1 FROM aloa_project_members
            WHERE project_id = aloa_project_writing_samples.project_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for writing style
CREATE POLICY "Super admins can do everything with writing style"
    ON aloa_project_writing_style
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Project admins can manage their project writing style"
    ON aloa_project_writing_style
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM aloa_user_profiles
            WHERE id = auth.uid() AND role = 'project_admin'
        )
        AND
        EXISTS (
            SELECT 1 FROM aloa_project_members
            WHERE project_id = aloa_project_writing_style.project_id
            AND user_id = auth.uid()
        )
    );

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_writing_style_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_writing_samples_timestamp ON aloa_project_writing_samples;
CREATE TRIGGER update_writing_samples_timestamp
    BEFORE UPDATE ON aloa_project_writing_samples
    FOR EACH ROW
    EXECUTE FUNCTION update_writing_style_timestamp();

DROP TRIGGER IF EXISTS update_writing_style_timestamp ON aloa_project_writing_style;
CREATE TRIGGER update_writing_style_timestamp
    BEFORE UPDATE ON aloa_project_writing_style
    FOR EACH ROW
    EXECUTE FUNCTION update_writing_style_timestamp();

-- Comments for documentation
COMMENT ON TABLE aloa_project_writing_samples IS 'Stores writing sample documents uploaded by project admins for AI style learning';
COMMENT ON TABLE aloa_project_writing_style IS 'Stores AI-generated and admin-editable writing style guide for each project';
COMMENT ON COLUMN aloa_project_writing_style.style_attributes IS 'JSON object containing detailed style analysis attributes';
COMMENT ON COLUMN aloa_project_writing_style.analysis_confidence IS 'AI confidence in style analysis based on sample quality and quantity (0.00-1.00)';
