import { createBrowserClient } from '@supabase/ssr';

// Detect if we're in Safari private mode
function isSafariPrivateMode() {
  if (typeof window === 'undefined') return false;

  const isWebkit = /webkit/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  if (!isSafari && !isWebkit) return false;

  // Check if localStorage is working
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return false;
  } catch (e) {
    return true;
  }
}

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

  // Enhanced options for Safari private mode
  const options = {};

  // In Safari private mode, use memory storage as fallback
  if (isSafariPrivateMode()) {
    console.log('[Supabase] Safari private mode detected, using memory storage fallback');

    // Create a memory-based storage adapter
    const memoryStorage = {
      items: new Map(),
      getItem: (key) => {
        return memoryStorage.items.get(key) || null;
      },
      setItem: (key, value) => {
        memoryStorage.items.set(key, value);
      },
      removeItem: (key) => {
        memoryStorage.items.delete(key);
      },
    };

    options.auth = {
      storage: memoryStorage,
      storageKey: 'aloa-auth-token',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    };
  }

  // Create client with appropriate options
  const client = createBrowserClient(url, key, options);

  // Store as global singleton
  window[SINGLETON_KEY] = client;

  return client;
}