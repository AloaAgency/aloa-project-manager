-- Migration: Add Prototype Review System - PART 1: Add Enum Value
-- Description: Adds 'prototype_review' to applet_type enum
-- Date: 2025-11-03
--
-- ⚠️  CRITICAL: This MUST be run BEFORE PART 2
-- ⚠️  PostgreSQL requires enum values to be committed before use
-- ⚠️  Run this file first, wait for success, THEN run PART 2
--
-- See: /docs/PROTOTYPE_REVIEW_IMPLEMENTATION_PLAN.md for complete implementation plan

-- =============================================================================
-- ADD ENUM VALUE (MUST BE IN SEPARATE TRANSACTION)
-- =============================================================================

-- Add prototype_review to applet_type enum if it doesn't exist
DO $$
BEGIN
    -- Check if the enum type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'applet_type') THEN
        -- Check if our value already exists in the enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'prototype_review'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'applet_type')
        ) THEN
            -- Add the new enum value
            ALTER TYPE applet_type ADD VALUE 'prototype_review';
            RAISE NOTICE '✅ Added prototype_review to applet_type enum';
        ELSE
            RAISE NOTICE 'ℹ️  prototype_review already exists in applet_type enum';
        END IF;
    ELSE
        RAISE EXCEPTION '❌ applet_type enum does not exist. Please run add_applets_system.sql first.';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  enum_exists BOOLEAN;
BEGIN
  -- Verify the enum value was added
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'prototype_review'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'applet_type')
  ) INTO enum_exists;

  IF enum_exists THEN
    RAISE NOTICE '🎉 PART 1 COMPLETE: Enum value added successfully';
    RAISE NOTICE '📋 NEXT STEP: Run add_prototype_review_system_PART2_tables.sql';
  ELSE
    RAISE EXCEPTION '❌ FAILED: Enum value was not added';
  END IF;
END $$;
