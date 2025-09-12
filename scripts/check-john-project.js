const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function checkJohnProject() {
  console.log('\n=== Checking John G\'s Project Assignment ===\n');
  
  // John G's user ID
  const johnId = 'beafc89b-1721-4d7c-9e33-67c64d27e211';
  
  // Check direct membership
  const { data: membership, error } = await supabase
    .from('aloa_project_members')
    .select('*, aloa_projects(id, project_name)')
    .eq('user_id', johnId);
  
  if (error) {
    console.error('Error fetching membership:', error);
  } else {
    console.log('John G\'s project memberships:', membership);
  }
  
  // Now test the exact query the API uses
  console.log('\n=== Testing API Query ===\n');
  
  const { data: apiResult, error: apiError } = await supabase
    .from('aloa_project_members')
    .select('user_id, project_id, aloa_projects(id, project_name, client_name)')
    .eq('user_id', johnId)
    .eq('project_role', 'viewer');
  
  if (apiError) {
    console.error('API query error:', apiError);
  } else {
    console.log('API query result:', apiResult);
  }
}

checkJohnProject();