-- Add Phase Review applet to the library
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM aloa_applet_library
        WHERE type = 'phase_review'
        AND name = 'Phase Review'
    ) THEN
        INSERT INTO aloa_applet_library (
            type, name, description, default_config,
            is_active, category, client_instructions,
            requires_approval, created_at, updated_at
        ) VALUES (
            'phase_review',
            'Phase Review',
            'Major milestone review with formal approval and revision tracking. Client reviews the design as a whole and signs off on the phase completion.',
            jsonb_build_object(
                'heading', 'Phase Review',
                'description', 'We''ve reached a major milestone! Please review the complete design and provide your feedback.',
                'locked', false,
                'max_revisions', 2,
                'remaining_revisions', 2,
                'approval_required', true,
                'review_items', jsonb_build_array(
                    jsonb_build_object(
                        'title', 'Overall Design',
                        'description', 'Does the design meet your vision and requirements?'
                    ),
                    jsonb_build_object(
                        'title', 'User Experience',
                        'description', 'Is the navigation and user flow intuitive?'
                    ),
                    jsonb_build_object(
                        'title', 'Visual Appeal',
                        'description', 'Are you satisfied with the visual design and aesthetics?'
                    ),
                    jsonb_build_object(
                        'title', 'Content',
                        'description', 'Is all the necessary content properly represented?'
                    ),
                    jsonb_build_object(
                        'title', 'Functionality',
                        'description', 'Are all required features and functionalities included?'
                    )
                )
            ),
            true,
            'collaboration',
            'This is a major milestone review. You can approve the phase, request specific revisions (limited number available), or discuss concerns with your team.',
            true,
            NOW(), NOW()
        );
    END IF;
END $$;