-- Fix aloa_projectlets table to have the correct columns

-- Add order_index column if it doesn't exist (rename from sequence_order if needed)
DO $$
BEGIN
    -- Check if sequence_order exists and order_index doesn't
    IF EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets'
        AND column_name = 'sequence_order'
    ) AND NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets'
        AND column_name = 'order_index'
    ) THEN
        -- Rename sequence_order to order_index
        ALTER TABLE aloa_projectlets
        RENAME COLUMN sequence_order TO order_index;
    ELSIF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets'
        AND column_name = 'order_index'
    ) THEN
        -- Add order_index column if neither exists
        ALTER TABLE aloa_projectlets
        ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add description column if it doesn't exist
ALTER TABLE aloa_projectlets
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Show the current structure of the table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'aloa_projectlets'
ORDER BY ordinal_position;