import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Force dynamic rendering for routes that use cookies
export const dynamic = 'force-dynamic';
export async function GET() {
  // Disable debug routes in production
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled in production' },
      { status: 403 }
    );
  }

  try {
    // Check environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    
    const envCheck = {
      hasUrl: !!url,
      urlLength: url?.length || 0,
      urlPrefix: url?.substring(0, 30) || 'missing',
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey?.length || 0,
      anonKeyPrefix: anonKey?.substring(0, 20) || 'missing',
      hasPublishableKey: !!publishableKey,
      publishableKeyLength: publishableKey?.length || 0,
      publishableKeyPrefix: publishableKey?.substring(0, 20) || 'missing',
      hasServiceKey: !!serviceKey,
      serviceKeyLength: serviceKey?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    };

    // Check which key to use
    const keyToUse = anonKey || publishableKey;
    if (!url || !keyToUse) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        envCheck,
        missingUrl: !url,
        missingKey: !keyToUse
      });
    }

    // Try to create a Supabase client
    let clientCreated = false;
    let clientError = null;
    let authCheckResult = null;
    
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        url,
        keyToUse,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
              cookieStore.set({ 
                name, 
                value, 
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                path: '/'
              });
            },
            remove(name, options) {
              cookieStore.set({ 
                name, 
                value: '', 
                ...options,
                maxAge: 0,
                path: '/'
              });
            }
          }
        }
      );
      
      clientCreated = true;
      
      // Try to check auth
      const { data, error } = await supabase.auth.getUser();
      authCheckResult = {
        hasUser: !!data?.user,
        authError: error?.message || null
      };
      
    } catch (err) {
      clientError = err.message;
    }

    // Test if the key format is valid
    const keyValidation = {
      isLegacyJWT: keyToUse?.startsWith('eyJ'),
      isNewFormat: keyToUse?.startsWith('sb_'),
      keyLength: keyToUse?.length || 0
    };

    return NextResponse.json({
      success: clientCreated,
      envCheck,
      keyValidation,
      clientError,
      authCheckResult,
      usingKey: anonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    });

  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
