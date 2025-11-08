-- Migration: Add Prototype Comments Table for Visual Commenting System
-- Description: Creates the aloa_prototype_comments table for markup.io-style visual commenting
-- Date: 2025-11-05
--
-- Prerequisites:
--   - aloa_prototypes table must exist (from add_prototype_review_system_PART2_tables.sql)
--   - prototype_review applet type must exist in enum
--
-- This table supports:
--   - Visual comment markers positioned by percentage (responsive)
--   - Threaded replies to comments
--   - Status tracking (open/resolved)
--   - Soft delete capability
--   - Full audit trail

-- =============================================================================
-- PHASE 1: Create Comments Table
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: aloa_prototype_comments
-- Purpose: Stores visual comments on prototypes with percentage-based positioning
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aloa_prototype_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Foreign keys
  prototype_id UUID NOT NULL REFERENCES aloa_prototypes(id) ON DELETE CASCADE,
  aloa_project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES aloa_prototype_comments(id) ON DELETE CASCADE,

  -- Comment content
  comment_text TEXT NOT NULL,
  comment_number INTEGER, -- Visual marker number (auto-generated for top-level comments)

  -- Positioning for visual markers (percentage-based for responsiveness)
  x_percent DECIMAL(5, 2), -- 0-100 percentage from left (NULL for replies)
  y_percent DECIMAL(5, 2), -- 0-100 percentage from top (NULL for replies)

  -- Author information
  author_id UUID REFERENCES aloa_user_profiles(id),
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES aloa_user_profiles(id),

  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES aloa_user_profiles(id),

  -- Metadata
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES aloa_user_profiles(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Backward compatibility: add missing columns if table already existed
-- Some environments may have an older version of this table without
-- newer columns like comment_number. These ALTERs make the migration
-- idempotent and prevent compile errors in functions/triggers below.
-- -----------------------------------------------------------------------------
ALTER TABLE aloa_prototype_comments
  ADD COLUMN IF NOT EXISTS comment_number INTEGER;

-- Ensure prototype counters exist for stats trigger compatibility
ALTER TABLE aloa_prototypes
  ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unresolved_comments INTEGER DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Indexes for Performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_prototype_comments_prototype
  ON aloa_prototype_comments(prototype_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_prototype_comments_project
  ON aloa_prototype_comments(aloa_project_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_prototype_comments_parent
  ON aloa_prototype_comments(parent_comment_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_prototype_comments_author
  ON aloa_prototype_comments(author_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_prototype_comments_status
  ON aloa_prototype_comments(status)
  WHERE is_deleted = false;

-- Composite index for fetching comments by prototype with positioning
CREATE INDEX IF NOT EXISTS idx_prototype_comments_position
  ON aloa_prototype_comments(prototype_id, x_percent, y_percent)
  WHERE is_deleted = false AND parent_comment_id IS NULL;

-- -----------------------------------------------------------------------------
-- Table Comments for Documentation
-- -----------------------------------------------------------------------------
COMMENT ON TABLE aloa_prototype_comments IS 'Stores visual comments on prototypes with markup.io-style positioning';
COMMENT ON COLUMN aloa_prototype_comments.comment_number IS 'Visual marker number shown on prototype (1, 2, 3...) - auto-generated for top-level comments';
COMMENT ON COLUMN aloa_prototype_comments.x_percent IS 'Horizontal position as percentage (0-100) from left edge - NULL for reply comments';
COMMENT ON COLUMN aloa_prototype_comments.y_percent IS 'Vertical position as percentage (0-100) from top edge - NULL for reply comments';
COMMENT ON COLUMN aloa_prototype_comments.parent_comment_id IS 'References parent comment for threaded replies';
COMMENT ON COLUMN aloa_prototype_comments.status IS 'Comment status: open (needs attention) or resolved (addressed)';

-- =============================================================================
-- PHASE 2: Row Level Security (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE aloa_prototype_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view comments on their project prototypes" ON aloa_prototype_comments;
DROP POLICY IF EXISTS "Users can create comments on their project prototypes" ON aloa_prototype_comments;
DROP POLICY IF EXISTS "Authors can update their own comments" ON aloa_prototype_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON aloa_prototype_comments;

-- Policy: Users can view comments for projects they're assigned to
CREATE POLICY "Users can view comments on their project prototypes"
ON aloa_prototype_comments FOR SELECT
USING (
  is_deleted = false
  AND aloa_project_id IN (
    SELECT project_id FROM aloa_project_stakeholders
    WHERE user_id = auth.uid()

    UNION

    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create comments on prototypes for their projects
CREATE POLICY "Users can create comments on their project prototypes"
ON aloa_prototype_comments FOR INSERT
WITH CHECK (
  aloa_project_id IN (
    SELECT project_id FROM aloa_project_stakeholders
    WHERE user_id = auth.uid()

    UNION

    SELECT project_id FROM aloa_project_members
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their own comments (for editing/resolving)
CREATE POLICY "Authors can update their own comments"
ON aloa_prototype_comments FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin')
  )
)
WITH CHECK (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin')
  )
);

-- Policy: Admins can manage all comments
CREATE POLICY "Admins can manage all comments"
ON aloa_prototype_comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin')
  )
);

-- =============================================================================
-- PHASE 3: Helper Functions and Triggers
-- =============================================================================

-- Function: Auto-generate comment numbers for top-level comments
CREATE OR REPLACE FUNCTION generate_comment_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate number for top-level comments (not replies)
  IF NEW.parent_comment_id IS NULL AND NEW.comment_number IS NULL THEN
    -- Get the next available number for this prototype
    SELECT COALESCE(MAX(comment_number), 0) + 1
    INTO NEW.comment_number
    FROM aloa_prototype_comments
    WHERE prototype_id = NEW.prototype_id
    AND parent_comment_id IS NULL
    AND is_deleted = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate comment numbers
DROP TRIGGER IF EXISTS trg_generate_comment_number ON aloa_prototype_comments;
CREATE TRIGGER trg_generate_comment_number
  BEFORE INSERT ON aloa_prototype_comments
  FOR EACH ROW
  EXECUTE FUNCTION generate_comment_number();

-- Function: Update prototype comment statistics
CREATE OR REPLACE FUNCTION update_prototype_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update comment counts on the prototype
  UPDATE aloa_prototypes
  SET
    total_comments = (
      SELECT COUNT(*)
      FROM aloa_prototype_comments
      WHERE prototype_id = COALESCE(NEW.prototype_id, OLD.prototype_id)
      AND is_deleted = false
    ),
    resolved_comments = (
      SELECT COUNT(*)
      FROM aloa_prototype_comments
      WHERE prototype_id = COALESCE(NEW.prototype_id, OLD.prototype_id)
      AND status = 'resolved'
      AND is_deleted = false
    ),
    unresolved_comments = (
      SELECT COUNT(*)
      FROM aloa_prototype_comments
      WHERE prototype_id = COALESCE(NEW.prototype_id, OLD.prototype_id)
      AND status = 'open'
      AND is_deleted = false
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.prototype_id, OLD.prototype_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update stats on comment changes
DROP TRIGGER IF EXISTS trg_update_prototype_stats ON aloa_prototype_comments;
CREATE TRIGGER trg_update_prototype_stats
  AFTER INSERT OR UPDATE OR DELETE ON aloa_prototype_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_prototype_comment_stats();

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prototype_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Track edits if the comment text changed
  IF OLD.comment_text IS DISTINCT FROM NEW.comment_text THEN
    NEW.edited_at = NOW();
    -- Note: edited_by should be set by the application layer
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update timestamps
DROP TRIGGER IF EXISTS trg_update_comment_timestamp ON aloa_prototype_comments;
CREATE TRIGGER trg_update_comment_timestamp
  BEFORE UPDATE ON aloa_prototype_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_prototype_comment_timestamp();

-- =============================================================================
-- MIGRATION VERIFICATION
-- =============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  policies_count INTEGER;
  triggers_count INTEGER;
  indexes_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'aloa_prototype_comments'
  ) INTO table_exists;

  -- Count policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'aloa_prototype_comments';

  -- Count triggers
  SELECT COUNT(*) INTO triggers_count
  FROM pg_trigger
  WHERE tgrelid = 'aloa_prototype_comments'::regclass
  AND tgname LIKE 'trg_%';

  -- Count indexes
  SELECT COUNT(*) INTO indexes_count
  FROM pg_indexes
  WHERE tablename = 'aloa_prototype_comments'
  AND indexname LIKE 'idx_prototype_comments%';

  -- Report results
  IF table_exists THEN
    RAISE NOTICE '✅ aloa_prototype_comments table created successfully';
  ELSE
    RAISE WARNING '❌ aloa_prototype_comments table was not created';
  END IF;

  RAISE NOTICE '📊 Created % RLS policies', policies_count;
  RAISE NOTICE '⚡ Created % triggers', triggers_count;
  RAISE NOTICE '🔍 Created % indexes', indexes_count;

  -- Final success message
  IF table_exists AND policies_count >= 4 AND triggers_count >= 2 THEN
    RAISE NOTICE '🎉 Prototype comments table migration completed successfully!';
    RAISE NOTICE '📋 The visual commenting system is now ready for use';
  ELSE
    RAISE WARNING '⚠️  Migration may be incomplete. Please check the results above.';
  END IF;
END $$;

-- =============================================================================
-- ROLLBACK SCRIPT (for reference - run manually if needed)
-- =============================================================================
/*
-- To rollback this migration, run:

-- Drop triggers
DROP TRIGGER IF EXISTS trg_generate_comment_number ON aloa_prototype_comments;
DROP TRIGGER IF EXISTS trg_update_prototype_stats ON aloa_prototype_comments;
DROP TRIGGER IF EXISTS trg_update_comment_timestamp ON aloa_prototype_comments;

-- Drop functions
DROP FUNCTION IF EXISTS generate_comment_number();
DROP FUNCTION IF EXISTS update_prototype_comment_stats();
DROP FUNCTION IF EXISTS update_prototype_comment_timestamp();

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view comments on their project prototypes" ON aloa_prototype_comments;
DROP POLICY IF EXISTS "Users can create comments on their project prototypes" ON aloa_prototype_comments;
DROP POLICY IF EXISTS "Authors can update their own comments" ON aloa_prototype_comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON aloa_prototype_comments;

-- Drop table
DROP TABLE IF EXISTS aloa_prototype_comments CASCADE;

RAISE NOTICE '✅ Rollback completed - aloa_prototype_comments table and related objects removed';
*/
