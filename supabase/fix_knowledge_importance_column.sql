-- Fix for project knowledge system - ensure importance_score column exists
-- Run this in Supabase SQL editor to fix the AI chat agent error

-- First check if the table exists
DO $$
BEGIN
    -- Check if importance_score column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'aloa_project_knowledge'
        AND column_name = 'importance_score'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE aloa_project_knowledge
        ADD COLUMN importance_score INTEGER DEFAULT 5
        CHECK (importance_score BETWEEN 1 AND 10);

        RAISE NOTICE 'Added importance_score column to aloa_project_knowledge table';
    ELSE
        RAISE NOTICE 'importance_score column already exists';
    END IF;

    -- Check if there's an old 'importance' column that needs to be migrated
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'aloa_project_knowledge'
        AND column_name = 'importance'
    ) THEN
        -- Migrate data from old column to new column
        UPDATE aloa_project_knowledge
        SET importance_score = importance::INTEGER
        WHERE importance IS NOT NULL
        AND importance_score IS NULL;

        -- Drop the old column
        ALTER TABLE aloa_project_knowledge DROP COLUMN importance;

        RAISE NOTICE 'Migrated data from importance to importance_score and dropped old column';
    END IF;
END $$;

-- Verify the table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'aloa_project_knowledge'
AND column_name IN ('importance', 'importance_score')
ORDER BY column_name;

-- Check if there's any data in the table
SELECT COUNT(*) as total_knowledge_items FROM aloa_project_knowledge;

-- Show sample data if it exists
SELECT
    id,
    project_id,
    source_type,
    source_name,
    category,
    importance_score,
    created_at
FROM aloa_project_knowledge
ORDER BY created_at DESC
LIMIT 5;