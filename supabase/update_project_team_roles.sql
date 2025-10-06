-- Update role constraints to allow client admin and participant roles
ALTER TABLE aloa_project_team
DROP CONSTRAINT IF EXISTS aloa_project_team_role_check;

ALTER TABLE aloa_project_team
ADD CONSTRAINT aloa_project_team_role_check CHECK (
  role IN (
    'client',
    'client_admin',
    'client_participant',
    'project_admin',
    'team_member',
    'admin',
    'designer',
    'developer',
    'copywriter',
    'viewer'
  )
);

ALTER TABLE user_invitations
DROP CONSTRAINT IF EXISTS user_invitations_role_check;

ALTER TABLE user_invitations
ADD CONSTRAINT user_invitations_role_check CHECK (
  role IN (
    'super_admin',
    'project_admin',
    'team_member',
    'client',
    'client_admin',
    'client_participant'
  )
);
