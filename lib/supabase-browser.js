import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase client for browser/client-side operations
// This properly handles cookie synchronization with server-side sessions
export function createClient() {
  // Skip during SSR completely
  if (typeof window === 'undefined') {
    return null;
  }

  // Use a global singleton attached to window
  // This ensures true singleton across all module imports and HMR reloads
  const SINGLETON_KEY = '__ALOA_SUPABASE_CLIENT__';

  if (window[SINGLETON_KEY]) {
    return window[SINGLETON_KEY];
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration is missing');
  }

  // Create client without explicit storage configuration
  // Let Supabase handle the storage automatically to avoid conflicts
  const client = createBrowserClient(url, key);

  // Store as global singleton
  window[SINGLETON_KEY] = client;

  return client;
}