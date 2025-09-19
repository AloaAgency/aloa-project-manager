-- Script to check and fix project metadata for AI insights

-- 1. First, check what's actually in the projects table
SELECT
    id,
    project_name,
    client_name,
    client_email,
    status,
    start_date,
    metadata,
    created_at
FROM aloa_projects
ORDER BY created_at DESC;

-- 2. Check if we need to add missing columns
ALTER TABLE aloa_projects
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS live_url TEXT,
ADD COLUMN IF NOT EXISTS staging_url TEXT,
ADD COLUMN IF NOT EXISTS target_launch_date DATE;

-- 3. If the data is in metadata field, extract it to proper columns
-- (Uncomment and modify as needed based on what you see in step 1)
/*
UPDATE aloa_projects
SET
    name = COALESCE(name, project_name, metadata->>'name', metadata->>'project_name'),
    description = COALESCE(description, metadata->>'description', 'Web design and development project'),
    live_url = COALESCE(live_url, metadata->>'live_url', metadata->>'current_site'),
    staging_url = COALESCE(staging_url, metadata->>'staging_url')
WHERE name IS NULL OR name = '';
*/

-- 4. Update a specific project with sample data (replace the ID)
-- This will help test the AI insights
/*
UPDATE aloa_projects
SET
    name = 'Ross Test Project',
    description = 'A modern web design project focused on creating an engaging user experience',
    live_url = 'https://example-current-site.com',
    staging_url = 'https://staging.example.com',
    target_launch_date = CURRENT_DATE + INTERVAL '30 days'
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';
*/

-- 5. Verify the updates
SELECT
    id,
    name,
    project_name,
    description,
    live_url,
    staging_url,
    start_date,
    target_launch_date,
    client_name,
    metadata
FROM aloa_projects
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';