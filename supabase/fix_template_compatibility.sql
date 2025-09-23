-- Fix aloa_projectlets table to support templates properly

-- 1. First, let's check what columns we actually have
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'aloa_projectlets'
ORDER BY ordinal_position;

-- 2. Make sure we have either sequence_order or order_index (prefer order_index for consistency)
DO $$
BEGIN
    -- If we have sequence_order but not order_index, add order_index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets' AND column_name = 'sequence_order'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets' AND column_name = 'order_index'
    ) THEN
        ALTER TABLE aloa_projectlets ADD COLUMN order_index INTEGER;
        UPDATE aloa_projectlets SET order_index = sequence_order;
        ALTER TABLE aloa_projectlets ALTER COLUMN order_index SET NOT NULL;
        ALTER TABLE aloa_projectlets ALTER COLUMN order_index SET DEFAULT 0;
    END IF;

    -- If we don't have order_index at all, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets' AND column_name = 'order_index'
    ) THEN
        ALTER TABLE aloa_projectlets ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. Handle the type column - it should allow 'standard' as a value
-- First check if type is an enum
DO $$
DECLARE
    type_is_enum BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_type t ON a.atttypid = t.oid
        WHERE a.attrelid = 'aloa_projectlets'::regclass
        AND a.attname = 'type'
        AND t.typtype = 'e'
    ) INTO type_is_enum;

    IF type_is_enum THEN
        -- It's an enum, make sure 'standard' is a valid value
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumtypid = (
                SELECT atttypid FROM pg_attribute
                WHERE attrelid = 'aloa_projectlets'::regclass AND attname = 'type'
            )
            AND enumlabel = 'standard'
        ) THEN
            -- Add 'standard' to the enum if it doesn't exist
            ALTER TYPE projectlet_type ADD VALUE IF NOT EXISTS 'standard';
        END IF;
    END IF;
END $$;

-- 4. Make type column have a default value
ALTER TABLE aloa_projectlets ALTER COLUMN type SET DEFAULT 'standard';

-- 5. Update any NULL type values to 'standard'
UPDATE aloa_projectlets SET type = 'standard' WHERE type IS NULL;

-- 6. Add color column to metadata if it doesn't exist as a separate column
-- (Color should be stored in metadata JSON)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aloa_projectlets' AND column_name = 'color'
    ) THEN
        -- Migrate color data to metadata
        UPDATE aloa_projectlets
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{color}',
            to_jsonb(color)
        )
        WHERE color IS NOT NULL;

        -- Drop the color column
        ALTER TABLE aloa_projectlets DROP COLUMN IF EXISTS color;
    END IF;
END $$;

-- Show final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'aloa_projectlets'
ORDER BY ordinal_position;