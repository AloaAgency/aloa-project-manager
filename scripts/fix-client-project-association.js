const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function fixClientProjectAssociation(clientEmail, projectName) {
  console.log(`\nFixing project association for client: ${clientEmail}`);
  console.log(`Project: ${projectName}\n`);
  
  try {
    // 1. Find the user
    const { data: profile, error: profileError } = await supabase
      .from('aloa_user_profiles')
      .select('*')
      .eq('email', clientEmail)
      .single();
    
    if (profileError || !profile) {
      console.error('User not found:', clientEmail);
      return;
    }
    
    console.log('Found user:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name
    });
    
    // 2. Find the project
    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select('*')
      .ilike('project_name', `%${projectName}%`)
      .single();
    
    if (projectError || !project) {
      console.error('Project not found:', projectName);
      // List available projects
      const { data: projects } = await supabase
        .from('aloa_projects')
        .select('id, project_name');
      console.log('\nAvailable projects:');
      projects?.forEach(p => console.log(`- ${p.project_name} (${p.id})`));
      return;
    }
    
    console.log('Found project:', {
      id: project.id,
      name: project.project_name,
      status: project.status
    });
    
    // 3. Check existing association
    const { data: existingMember } = await supabase
      .from('aloa_project_members')
      .select('*')
      .eq('user_id', profile.id)
      .eq('project_id', project.id)
      .single();
    
    if (existingMember) {
      console.log('\n✓ Association already exists:', existingMember);
      return;
    }
    
    // 4. Create the association
    console.log('\nCreating project association...');
    const { data: newMember, error: insertError } = await supabase
      .from('aloa_project_members')
      .insert({
        project_id: project.id,
        user_id: profile.id,
        project_role: 'viewer',  // clients are viewers
        can_edit: false,
        can_delete: false,
        can_invite: false,
        can_manage_team: false,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating association:', insertError);
      return;
    }
    
    console.log('✓ Successfully created association:', newMember);
    
    // 5. Add timeline entry
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: project.id,
        event_type: 'user_joined',
        description: `${profile.full_name} was added to the project as client`,
        created_by: profile.id,
        metadata: {
          user_id: profile.id,
          role: 'client',
          manual_fix: true
        }
      });
    
    console.log('✓ Added timeline entry');
    console.log('\n✅ Client project association fixed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
// Change these values to match your client's email and project name
fixClientProjectAssociation('exabyte@me.com', 'Test project');