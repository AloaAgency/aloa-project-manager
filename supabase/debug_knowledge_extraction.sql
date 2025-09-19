-- Debug script to check knowledge extraction status and manually trigger extraction if needed

-- 1. Check if aloa_project_knowledge table exists and has any data
SELECT COUNT(*) as knowledge_count
FROM aloa_project_knowledge;

-- 2. Check recent applet interactions
SELECT
    ai.id,
    ai.project_id,
    ai.applet_id,
    ai.interaction_type,
    ai.data,
    ai.created_at,
    a.name as applet_name,
    a.type as applet_type
FROM aloa_applet_interactions ai
JOIN aloa_applets a ON ai.applet_id = a.id
ORDER BY ai.created_at DESC
LIMIT 10;

-- 3. Check if there are any tone_of_voice interactions
SELECT
    ai.id,
    ai.project_id,
    ai.data,
    a.name,
    a.type
FROM aloa_applet_interactions ai
JOIN aloa_applets a ON ai.applet_id = a.id
WHERE a.type = 'tone_of_voice'
ORDER BY ai.created_at DESC;

-- 4. Check the extraction queue
SELECT * FROM aloa_knowledge_extraction_queue
ORDER BY created_at DESC
LIMIT 20;

-- 5. Manually insert knowledge for any existing tone_of_voice interactions
-- (uncomment and modify as needed)
/*
INSERT INTO aloa_project_knowledge (
    project_id,
    source_type,
    source_id,
    source_name,
    content_type,
    content,
    content_summary,
    category,
    tags,
    importance_score,
    extracted_by,
    extraction_confidence,
    processed_at,
    is_current
)
SELECT
    ai.project_id,
    'applet_interaction',
    ai.id::text,
    CONCAT(a.name, ' - Tone of Voice'),
    'preferences',
    jsonb_build_object(
        'tone', ai.data->'form_progress'->'selectedTone',
        'toneName', ai.data->'form_progress'->'toneName',
        'educationLevel', ai.data->'form_progress'->'educationLevel',
        'educationLevelName', ai.data->'form_progress'->'educationLevelName'
    )::text,
    CONCAT('Client selected brand voice: ',
           COALESCE(ai.data->'form_progress'->>'toneName', ai.data->'form_progress'->>'selectedTone'),
           CASE
               WHEN ai.data->'form_progress'->>'educationLevelName' IS NOT NULL
               THEN CONCAT(' at ', ai.data->'form_progress'->>'educationLevelName', ' level')
               ELSE ''
           END
    ),
    'content_strategy',
    ARRAY['tone', 'voice', 'brand_personality', 'content'],
    8,
    'manual_extraction',
    1.0,
    NOW(),
    true
FROM aloa_applet_interactions ai
JOIN aloa_applets a ON ai.applet_id = a.id
WHERE a.type = 'tone_of_voice'
AND ai.data->'form_progress'->'selectedTone' IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM aloa_project_knowledge pk
    WHERE pk.source_type = 'applet_interaction'
    AND pk.source_id = ai.id::text
);
*/

-- 6. Check project details for context
SELECT
    id,
    name,
    description,
    live_url,
    created_at
FROM aloa_projects
ORDER BY created_at DESC
LIMIT 5;