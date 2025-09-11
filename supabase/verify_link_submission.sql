-- Verification script for link submission applet

-- 1. Check if link_submission is in the enum
SELECT unnest(enum_range(NULL::applet_type)) AS applet_types
ORDER BY applet_types;

-- 2. Check if the applet exists in the library
SELECT 
  id,
  name,
  type,
  description,
  icon,
  is_active,
  usage_count,
  created_at
FROM aloa_applet_library 
WHERE type = 'link_submission'::applet_type;

-- 3. Check if client_acknowledgment column exists
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'aloa_applets' 
  AND column_name = 'client_acknowledgment';

-- 4. Check for any existing link submission applets
SELECT 
  a.id,
  a.name,
  a.type,
  a.config,
  a.client_acknowledgment,
  p.name as projectlet_name
FROM aloa_applets a
LEFT JOIN aloa_projectlets p ON a.projectlet_id = p.id
WHERE a.type = 'link_submission'::applet_type
LIMIT 5;