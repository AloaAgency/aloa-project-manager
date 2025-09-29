-- File: /supabase/security_fix_01_create_test_users.sql
-- Purpose: Seed deterministic test identities used for security validation.
-- This script is idempotent. Re-running it will reset passwords for the
-- seeded users and ensure their profile/project memberships are in place.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- Attempt to pick two projects for membership tests
  v_client_project UUID;
  v_outsider_project UUID;

  v_user RECORD;
  v_actual_id UUID;

BEGIN
  -- Select first project for client membership
  SELECT id
  INTO v_client_project
  FROM aloa_projects
  ORDER BY created_at
  LIMIT 1;

  -- Select a different project (if available) for outsider membership tests
  SELECT id
  INTO v_outsider_project
  FROM aloa_projects
  WHERE id <> v_client_project
  ORDER BY created_at
  LIMIT 1;

  FOR v_user IN
    SELECT *
    FROM (
      VALUES
        ('11111111-1111-1111-1111-111111111111'::UUID, 'test_client@test.com', 'ClientPass123!'::TEXT, 'Test Client', 'client', 'client', 'viewer'),
        ('22222222-2222-2222-2222-222222222222'::UUID, 'test_admin@test.com', 'AdminPass123!'::TEXT, 'Test Admin', 'super_admin', 'none', 'admin'),
        ('33333333-3333-3333-3333-333333333333'::UUID, 'test_outsider@test.com', 'OutsiderPass123!'::TEXT, 'Test Outsider', 'client', 'outsider', 'viewer')
    ) AS seed(desired_id, email, password, full_name, role, project_assignment, project_role)
  LOOP
    -- Find existing auth user (if any)
    SELECT id INTO v_actual_id
    FROM auth.users
    WHERE email = v_user.email;

    IF v_actual_id IS NULL THEN
      INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at
      )
      VALUES (
        v_user.desired_id,
        v_user.email,
        crypt(v_user.password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('full_name', v_user.full_name),
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
      );

      v_actual_id := v_user.desired_id;
      RAISE NOTICE 'Created auth user %', v_user.email;
    ELSE
      UPDATE auth.users
      SET
        encrypted_password = crypt(v_user.password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_build_object('full_name', v_user.full_name),
        updated_at = NOW()
      WHERE id = v_actual_id;

      RAISE NOTICE 'Updated auth user %', v_user.email;
    END IF;

    -- Ensure profile exists with the correct role
    INSERT INTO aloa_user_profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
      v_actual_id,
      v_user.email,
      v_user.full_name,
      v_user.role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        updated_at = NOW();

    RAISE NOTICE 'Upserted profile for %', v_user.email;

    -- Manage project membership based on assignment flag
    IF v_user.project_assignment = 'client' THEN
      IF v_client_project IS NOT NULL THEN
        INSERT INTO aloa_project_members (project_id, user_id, project_role)
        VALUES (v_client_project, v_actual_id, v_user.project_role)
        ON CONFLICT (project_id, user_id) DO UPDATE
          SET project_role = EXCLUDED.project_role;

        RAISE NOTICE 'Linked % to client test project %', v_user.email, v_client_project;
      ELSE
        RAISE WARNING 'No projects found to assign test_client@test.com. Create a project before running tests.';
      END IF;
    ELSIF v_user.project_assignment = 'outsider' THEN
      IF v_outsider_project IS NOT NULL THEN
        INSERT INTO aloa_project_members (project_id, user_id, project_role)
        VALUES (v_outsider_project, v_actual_id, v_user.project_role)
        ON CONFLICT (project_id, user_id) DO UPDATE
          SET project_role = EXCLUDED.project_role;

        RAISE NOTICE 'Linked % to outsider test project %', v_user.email, v_outsider_project;
      ELSE
        RAISE WARNING 'Second project not found. Outsider user will not have project access for RLS tests.';
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '--- Test users ready ---';
  RAISE NOTICE 'Client:    % / %', 'test_client@test.com', 'ClientPass123!';
  RAISE NOTICE 'Admin:     % / %', 'test_admin@test.com', 'AdminPass123!';
  RAISE NOTICE 'Outsider:  % / %', 'test_outsider@test.com', 'OutsiderPass123!';
  RAISE NOTICE 'Update passwords in Supabase Auth UI if different credentials are preferred.';
END $$;
