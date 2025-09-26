-- Add copy_collection applet to the library (required for it to appear in the Add Applet modal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'copy_collection'
        AND name = 'Copy Collection'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, created_at, updated_at
        ) VALUES (
            'copy_collection',
            'Copy Collection',
            'Gather webpage copy either through direct upload/paste or guided forms. Clients can provide existing copy or fill out forms to help generate copy.',
            '{"description": "Collect copy for your webpage - Either upload approved copy directly or fill out forms to help us create it", "locked": false, "formId": null, "mode": null}'::jsonb,
            true,
            'content',
            'Choose how you''d like to provide copy for this page: upload existing and approved content (preferred) or fill out a form to help us create it for you.',
            false,
            NOW(), NOW()
        );
    END IF;
END $$;