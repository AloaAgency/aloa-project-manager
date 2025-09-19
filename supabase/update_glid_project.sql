-- Update the Glīd Website Redesign project with complete information

UPDATE aloa_projects
SET
    name = 'Glīd Website Redesign',
    description = 'Complete website redesign for Glīd, focusing on modern aesthetics and improved user experience. Project includes 5 main pages and 5 auxiliary pages.',
    live_url = 'https://aloa.agency',  -- Using the URL from metadata
    staging_url = 'https://staging-glid.aloa.agency',
    target_launch_date = '2025-10-19'  -- 30 days from start date
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';

-- Verify the update
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
    status,
    metadata
FROM aloa_projects
WHERE id = '511306f6-0316-4a60-a318-1509d643238a';