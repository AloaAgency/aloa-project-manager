import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase client for browser/client-side operations
// This properly handles cookie synchronization with server-side sessions
let supabase = null;

export function createClient() {
  // Singleton pattern to reuse the same client
  if (supabase) return supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Creating Supabase browser client with:', {
    url: url,
    keyPrefix: key ? key.substring(0, 20) + '...' : 'NO KEY'
  });
  
  if (!url || !key) {
    console.error('Missing Supabase environment variables');
    throw new Error('Supabase configuration is missing');
  }
  
  supabase = createBrowserClient(url, key);
  return supabase;
}