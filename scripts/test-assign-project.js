const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function testAssignProject() {

  // Test the query that's failing
  const userId = 'beafc89b-1721-4d7c-9e33-67c64d27e211'; // John G
  const projectId = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'; // Test project

  try {
    // Check if assignment already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('aloa_project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {

      return;
    }

    if (existingAssignment) {

      // Try to remove it first

      const { error: deleteError } = await supabase
        .from('aloa_project_members')
        .delete()
        .eq('id', existingAssignment.id);

      if (deleteError) {

        return;
      }

    }

    // Now try to add the assignment

    const { data: newMember, error: insertError } = await supabase
      .from('aloa_project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        project_role: 'viewer',
        can_edit: false,
        can_delete: false,
        can_invite: false,
        can_manage_team: false,
        invited_by: null, // Can be null
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {

      return;
    }

  } catch (error) {

  }
}

testAssignProject();