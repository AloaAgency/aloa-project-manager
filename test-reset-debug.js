// Debug script to test password reset link generation
const { createClient } = require('@supabase/supabase-js');

// Use your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'YOUR_SERVICE_KEY';

async function testResetLink() {
  console.log('Testing password reset link generation...\n');

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const testEmail = 'test@example.com'; // Change to a real email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

  console.log('Configuration:');
  console.log('- Supabase URL:', supabaseUrl);
  console.log('- App URL:', appUrl);
  console.log('- Redirect to:', `${appUrl}/auth/update-password`);
  console.log('');

  try {
    // Generate link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: testEmail,
      options: {
        redirectTo: `${appUrl}/auth/update-password`
      }
    });

    if (error) {
      console.error('Error generating link:', error);
      return;
    }

    if (data?.properties?.action_link) {
      console.log('Generated link successfully!');
      console.log('');
      console.log('Action link:', data.properties.action_link);
      console.log('');

      // Parse the URL to see its structure
      const url = new URL(data.properties.action_link);
      console.log('Link breakdown:');
      console.log('- Host:', url.host);
      console.log('- Path:', url.pathname);
      console.log('- Redirect to:', url.searchParams.get('redirect_to'));
      console.log('');
      console.log('IMPORTANT: Make sure the redirect URL is whitelisted in:');
      console.log('Supabase Dashboard > Authentication > URL Configuration > Redirect URLs');
      console.log('');
      console.log('Add these URLs to the whitelist:');
      console.log('- http://localhost:3001/auth/update-password');
      console.log('- http://localhost:3001/auth/callback');
      console.log('- https://aloa-project-manager.vercel.app/auth/update-password');
      console.log('- https://aloa-project-manager.vercel.app/auth/callback');
    } else {
      console.log('No action link generated');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testResetLink();