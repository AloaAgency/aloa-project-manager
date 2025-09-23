-- Check what type values are actually being used in existing projectlets
SELECT DISTINCT type, COUNT(*) as count
FROM aloa_projectlets
WHERE type IS NOT NULL
GROUP BY type
ORDER BY count DESC;

-- Also check a few actual records to see their structure
SELECT id, name, type, status, order_index, sequence_order
FROM aloa_projectlets
LIMIT 5;