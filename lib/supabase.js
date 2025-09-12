import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Check for ANON_KEY first as it's the one that's actually set in the environment
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Log what we're using (without exposing full key)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase client config:', {
    url: supabaseUrl ? 'present' : 'missing',
    keySource: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'ANON_KEY' : 
               process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'PUBLISHABLE_KEY' : 'missing',
    keyPrefix: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'missing'
  });
}

// Only check for environment variables in production or when actually using the client
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else if (process.env.NODE_ENV === 'production') {
  console.error('Warning: Supabase environment variables are missing');
}

export { supabase };