-- Migration: Add Prototype Review System (Phase 1)
-- Description: Creates tables and applet type for prototype viewer with visual commenting
-- Date: 2025-11-03
-- See: /docs/PROTOTYPE_REVIEW_IMPLEMENTATION_PLAN.md for complete implementation plan

-- =============================================================================
-- PHASE 1: Foundation Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: aloa_prototypes
-- Purpose: Stores prototype/mockup metadata and URL/file references
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_prototypes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aloa_project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  applet_id UUID REFERENCES aloa_applets(id) ON DELETE CASCADE,

  -- Prototype metadata
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'superseded'

  -- Source information
  source_type TEXT NOT NULL, -- 'url', 'screenshot', 'upload'
  source_url TEXT, -- Original URL if type = 'url'
  screenshot_url TEXT, -- Supabase storage path to screenshot
  file_url TEXT, -- Supabase storage path for uploaded images

  -- Viewport metadata (for responsive rendering)
  viewport_width INTEGER DEFAULT 1920,
  viewport_height INTEGER DEFAULT 1080,
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'tablet', 'mobile'

  -- Review settings
  review_deadline TIMESTAMP WITH TIME ZONE,
  requires_approval BOOLEAN DEFAULT false,
  min_reviewers INTEGER DEFAULT 1,

  -- Statistics (will be updated by triggers in Phase 2)
  total_comments INTEGER DEFAULT 0,
  resolved_comments INTEGER DEFAULT 0,
  unresolved_comments INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES aloa_user_profiles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prototypes_project ON aloa_prototypes(aloa_project_id);
CREATE INDEX IF NOT EXISTS idx_prototypes_applet ON aloa_prototypes(applet_id);
CREATE INDEX IF NOT EXISTS idx_prototypes_status ON aloa_prototypes(status);

-- Add comment explaining the table
COMMENT ON TABLE aloa_prototypes IS 'Stores prototype and mockup metadata for visual commenting system';
COMMENT ON COLUMN aloa_prototypes.source_type IS 'Type of prototype source: url (screenshot captured), screenshot (direct capture), upload (manual file)';
COMMENT ON COLUMN aloa_prototypes.viewport_width IS 'Original viewport width used for screenshot/viewing';
COMMENT ON COLUMN aloa_prototypes.total_comments IS 'Total number of comments (updated by trigger in Phase 2)';

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE aloa_prototypes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view prototypes for projects they're assigned to
CREATE POLICY IF NOT EXISTS "Users can view prototypes for their projects"
ON aloa_prototypes FOR SELECT
USING (
  aloa_project_id IN (
    SELECT aloa_project_id FROM aloa_project_stakeholders
    WHERE user_id = auth.uid()
  )
);

-- Policy: Admins and team members can create/update/delete prototypes
CREATE POLICY IF NOT EXISTS "Admins can manage prototypes"
ON aloa_prototypes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin', 'team_member')
  )
);

-- =============================================================================
-- APPLET TYPE CONFIGURATION
-- =============================================================================

-- Note: We need to check if applet_type enum exists and add our new type
-- The add_applets_system.sql migration should have created the enum

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
            RAISE NOTICE 'Added prototype_review to applet_type enum';
        ELSE
            RAISE NOTICE 'prototype_review already exists in applet_type enum';
        END IF;
    ELSE
        RAISE EXCEPTION 'applet_type enum does not exist. Please run add_applets_system.sql first.';
    END IF;
END $$;

-- Add Prototype Review to applet library
INSERT INTO aloa_applet_library (
  type,
  name,
  description,
  default_config,
  is_active,
  category,
  client_instructions,
  requires_approval,
  access_type,
  created_at,
  updated_at
)
SELECT
  'prototype_review'::applet_type,
  'Prototype Review',
  'Visual feedback and commenting on prototypes, mockups, and live websites. Click anywhere on the prototype to leave a comment.',
  '{"locked": false, "allowMultiplePrototypes": true, "autoResolveOnApproval": false}'::jsonb,
  true,
  'collaboration',
  'Click anywhere on the prototype to leave a comment. Your feedback will appear as a numbered marker. You can reply to existing comments and mark them as resolved once addressed.',
  false,
  'input'::applet_access_type,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM aloa_applet_library WHERE type = 'prototype_review'::applet_type
);

-- =============================================================================
-- MIGRATION VERIFICATION
-- =============================================================================

-- Verify the migration was successful
DO $$
DECLARE
  prototype_table_exists BOOLEAN;
  applet_library_entry_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'aloa_prototypes'
  ) INTO prototype_table_exists;

  -- Check if applet library entry exists
  SELECT EXISTS (
    SELECT FROM aloa_applet_library
    WHERE type = 'prototype_review'::applet_type
  ) INTO applet_library_entry_exists;

  -- Report results
  IF prototype_table_exists THEN
    RAISE NOTICE '✅ aloa_prototypes table created successfully';
  ELSE
    RAISE WARNING '❌ aloa_prototypes table was not created';
  END IF;

  IF applet_library_entry_exists THEN
    RAISE NOTICE '✅ Prototype Review applet added to library';
  ELSE
    RAISE WARNING '❌ Prototype Review applet was not added to library';
  END IF;

  -- Final success message
  IF prototype_table_exists AND applet_library_entry_exists THEN
    RAISE NOTICE '🎉 Phase 1 migration completed successfully!';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Create API routes for prototype CRUD operations';
    RAISE NOTICE '   2. Build PrototypeViewer.js component';
    RAISE NOTICE '   3. Add prototype upload functionality';
    RAISE NOTICE '   See /docs/PROTOTYPE_REVIEW_IMPLEMENTATION_PLAN.md for details';
  END IF;
END $$;

-- =============================================================================
-- ROLLBACK SCRIPT (for reference - run manually if needed)
-- =============================================================================
/*
-- To rollback this migration, run:

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view prototypes for their projects" ON aloa_prototypes;
DROP POLICY IF EXISTS "Admins can manage prototypes" ON aloa_prototypes;

-- Drop table
DROP TABLE IF EXISTS aloa_prototypes CASCADE;

-- Remove from applet library
DELETE FROM aloa_applet_library WHERE type = 'prototype_review';

-- Note: Cannot easily remove enum value once added
-- Would need to recreate enum if removal is critical
*/
