const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function listUsersAndProjects() {

  // List all users
  const { data: users, error: usersError } = await supabase
    .from('aloa_user_profiles')
    .select('id, email, full_name, role')
    .order('created_at', { ascending: false });

  if (usersError) {

  } else {
    users?.forEach(user => {
      - Role: ${user.role}`);
    });
  }

  // List all projects
  const { data: projects, error: projectsError } = await supabase
    .from('aloa_projects')
    .select('id, project_name, status')
    .order('created_at', { ascending: false });

  if (projectsError) {

  } else {
    projects?.forEach(project => {
      - Status: ${project.status}`);
    });
  }

  // List all project members
  const { data: members, error: membersError } = await supabase
    .from('aloa_project_members')
    .select(`
      project_id,
      user_id,
      project_role,
      aloa_projects (project_name),
      aloa_user_profiles (email, full_name)
    `)
    .order('created_at', { ascending: false });

  if (membersError) {

  } else {
    members?.forEach(member => {
      const userName = member.aloa_user_profiles?.full_name || 'Unknown';
      const userEmail = member.aloa_user_profiles?.email || 'Unknown';
      const projectName = member.aloa_projects?.project_name || 'Unknown';
      - Project: ${projectName} - Role: ${member.project_role}`);
    });
  }
}

listUsersAndProjects();