-- File: /supabase/security_fix_01_rollback_test_users.sql
-- Purpose: Remove the seeded test identities created by security_fix_01_create_test_users.sql.

DO $$
DECLARE
  v_user_ids CONSTANT UUID[] := ARRAY[
    '11111111-1111-1111-1111-111111111111'::UUID,
    '22222222-2222-2222-2222-222222222222'::UUID,
    '33333333-3333-3333-3333-333333333333'::UUID
  ];
BEGIN
  -- Remove related project memberships first to satisfy FK constraints
  DELETE FROM aloa_project_members
  WHERE user_id = ANY(v_user_ids);

  -- Remove seeded profiles
  DELETE FROM aloa_user_profiles
  WHERE id = ANY(v_user_ids);

  -- Remove Auth users
  DELETE FROM auth.users
  WHERE id = ANY(v_user_ids);

  RAISE NOTICE 'Removed seeded test users and related memberships.';
END $$;
