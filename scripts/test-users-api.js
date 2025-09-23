const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function testUsersApi() {

  // Get all users with their profiles
  const { data: users, error: usersError } = await supabase
    .from('aloa_user_profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (usersError) {

    return;
  }

  // Get project assignments for client users
  const clientIds = users.filter(u => u.role === 'client').map(u => u.id);

  let projectAssignments = {};

  if (clientIds.length > 0) {
    // Get from aloa_project_members table (where we actually store client assignments)
    const { data: members, error: membersError } = await supabase
      .from('aloa_project_members')
      .select('user_id, project_id, project_role, aloa_projects(id, project_name, client_name)')
      .in('user_id', clientIds)
      .eq('project_role', 'viewer'); // Clients are stored as 'viewer' role

    if (members) {
      members.forEach(m => {
        if (!projectAssignments[m.user_id]) {
          projectAssignments[m.user_id] = [];
        }
        projectAssignments[m.user_id].push(m.aloa_projects);
      });
    }

  }

  // Add project info to users
  const usersWithProjects = users.map(user => ({
    ...user,
    projects: projectAssignments[user.id] || []
  }));

  // Find John G
  const johnG = usersWithProjects.find(u => u.email === 'exabyte@me.com');

  );
}

testUsersApi();