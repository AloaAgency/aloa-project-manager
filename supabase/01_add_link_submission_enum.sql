-- STEP 1: Run this FIRST and COMMIT
-- This adds the new enum value to applet_type

ALTER TYPE applet_type ADD VALUE IF NOT EXISTS 'link_submission';

-- After running this, the transaction MUST be committed before proceeding to step 2