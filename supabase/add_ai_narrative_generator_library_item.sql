-- Add AI Narrative Generator applet to the library (required for it to appear in the Add Applet modal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'ai_narrative_generator'
        AND name = 'AI Narrative Generator'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, created_at, updated_at
        ) VALUES (
            'ai_narrative_generator',
            'AI Narrative Generator',
            'Transform form responses into website-ready narrative copy. AI generates structured content from client inputs that designers can use to create page layouts.',
            jsonb_build_object(
                'description', 'Generate structured narrative content from form responses',
                'locked', false,
                'formId', null,
                'pageName', 'Homepage',
                'generatedContent', null,
                'aiGenerated', false,
                'lastGeneratedAt', null
            ),
            true,
            'content',
            'Review the AI-generated narrative structure for your website page. This content has been created based on your form responses and structured for optimal web presentation.',
            false,
            NOW(),
            NOW()
        );
    END IF;
END $$;