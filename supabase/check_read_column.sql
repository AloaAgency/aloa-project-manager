-- Check if read column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'aloa_applet_interactions'
ORDER BY ordinal_position;
