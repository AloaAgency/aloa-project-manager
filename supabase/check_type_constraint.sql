-- Check what constraint exists on the type field
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'aloa_projectlets'::regclass
AND conname LIKE '%type%';

-- If type is an enum, show allowed values
SELECT
    t.typname AS enum_name,
    e.enumlabel AS allowed_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.oid = (
    SELECT atttypid
    FROM pg_attribute
    WHERE attrelid = 'aloa_projectlets'::regclass
    AND attname = 'type'
)
ORDER BY e.enumsortorder;

-- Check if there's a CHECK constraint
SELECT
    c.conname,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
WHERE c.conrelid = 'aloa_projectlets'::regclass
AND c.contype = 'c'; -- CHECK constraints