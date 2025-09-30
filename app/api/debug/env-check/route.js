import { NextResponse } from 'next/server';

export async function GET() {
  // Disable debug routes in production
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints are disabled in production' },
      { status: 403 }
    );
  }

  // Only show in non-production or for debugging
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    
    // Check NEW format keys (what we should be using)
    new_format: {
      has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      
      has_publishable_key: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      publishable_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...'
        : 'NOT SET',
      publishable_key_starts_with_sb: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') || false,
        
      has_secret_key: !!process.env.SUPABASE_SECRET_KEY,
      secret_key_prefix: process.env.SUPABASE_SECRET_KEY
        ? process.env.SUPABASE_SECRET_KEY.substring(0, 15) + '...'
        : 'NOT SET',
      secret_key_starts_with_sb: process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_') || false,
    },
    
    // Check legacy format keys (should NOT exist)
    legacy_format: {
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anon_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...'
        : 'NOT SET',
      anon_key_starts_with_eyJ: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false,
      
      has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_role_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...'
        : 'NOT SET',
      service_role_starts_with_eyJ: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false,
    },
    
    // Key selection logic (what the app will actually use)
    actual_keys_used: {
      publishable: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'NEW FORMAT' : 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'LEGACY FORMAT' : 'NONE',
      service: process.env.SUPABASE_SECRET_KEY ? 'NEW FORMAT' :
               process.env.SUPABASE_SERVICE_ROLE_KEY ? 'LEGACY FORMAT' : 'NONE',
    },
    
    // Validation
    validation: {
      url_is_supabase: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') || false,
      keys_are_new_format: 
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_') || false) &&
        (process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_') || false),
    }
  };
  
  return NextResponse.json(envCheck);
}