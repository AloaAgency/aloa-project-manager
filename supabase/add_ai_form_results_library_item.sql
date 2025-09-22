-- Add AI Form Results applet to the library (required for it to appear in the Add Applet modal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'ai_form_results'
        AND name = 'AI Form Results'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, created_at, updated_at
        ) VALUES (
            'ai_form_results',
            'AI Form Results',
            'AI-powered insights and summary generated from form responses. Admins can review, edit, and approve before sharing with clients.',
            '{"description": "AI-generated insights from form responses", "locked": false, "form_id": null, "ai_report": null, "last_generated_at": null}'::jsonb,
            true,
            'content',
            'View AI-generated insights and summary from your form submissions. This report provides key findings and recommendations based on all responses.',
            false,
            NOW(), NOW()
        );
    END IF;
END $$;