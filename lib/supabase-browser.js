import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase client for browser/client-side operations
// This properly handles cookie synchronization with server-side sessions
let supabase = null;

export function createClient() {
  // Singleton pattern to reuse the same client
  if (supabase) return supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  
  if (!url || !key) {
    throw new Error('Supabase configuration is missing');
  }
  
  supabase = createBrowserClient(url, key);
  return supabase;
}