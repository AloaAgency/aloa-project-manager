-- Check the current structure of aloa_projectlets table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'aloa_projectlets'
ORDER BY ordinal_position;

-- Check constraints on the table
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'aloa_projectlets'::regclass;

-- Check if we have both sequence_order and order_index
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aloa_projectlets' AND column_name = 'sequence_order')
        THEN 'sequence_order EXISTS'
        ELSE 'sequence_order DOES NOT EXIST'
    END AS sequence_order_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aloa_projectlets' AND column_name = 'order_index')
        THEN 'order_index EXISTS'
        ELSE 'order_index DOES NOT EXIST'
    END AS order_index_status;

-- Check what values are allowed for type column
SELECT
    enumlabel AS allowed_type_value
FROM pg_enum
WHERE enumtypid = (
    SELECT atttypid
    FROM pg_attribute
    WHERE attrelid = 'aloa_projectlets'::regclass
    AND attname = 'type'
)
ORDER BY enumsortorder;