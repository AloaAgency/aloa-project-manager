const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function testAssignProject() {
  console.log('\n=== Testing Project Assignment ===\n');
  
  // Test the query that's failing
  const userId = 'beafc89b-1721-4d7c-9e33-67c64d27e211'; // John G
  const projectId = '0cb872ed-3c22-4b3d-92e7-f1b9d542d63a'; // Test project
  
  console.log('Testing for existing assignment...');
  console.log('User ID:', userId);
  console.log('Project ID:', projectId);
  
  try {
    // Check if assignment already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('aloa_project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing assignment:', checkError);
      return;
    }
    
    if (existingAssignment) {
      console.log('Assignment already exists:', existingAssignment);
      
      // Try to remove it first
      console.log('\nRemoving existing assignment...');
      const { error: deleteError } = await supabase
        .from('aloa_project_members')
        .delete()
        .eq('id', existingAssignment.id);
      
      if (deleteError) {
        console.error('Error removing assignment:', deleteError);
        return;
      }
      console.log('✓ Removed existing assignment');
    }
    
    // Now try to add the assignment
    console.log('\nAdding new assignment...');
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
      console.error('Error adding assignment:', insertError);
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return;
    }
    
    console.log('✓ Successfully added assignment:', newMember);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testAssignProject();