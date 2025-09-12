import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only check for environment variables in production or when actually using the client
let supabase = null;

if (supabaseUrl && supabasePublishableKey) {
  supabase = createClient(supabaseUrl, supabasePublishableKey);
} else if (process.env.NODE_ENV === 'production') {
  console.error('Warning: Supabase environment variables are missing');
}

export { supabase };