import { NextResponse } from 'next/server';

export async function GET() {
  // Only show in non-production or for debugging
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    
    // Check if Supabase variables exist (not the actual values for security)
    supabase: {
      has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anon_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 30) + '...'
        : 'NOT SET',
      
      has_publishable_key: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      publishable_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.substring(0, 30) + '...'
        : 'NOT SET',
        
      has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_role_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 30) + '...'
        : 'NOT SET',
    },
    
    // Check other important variables
    resend: {
      has_api_key: !!process.env.RESEND_API_KEY,
      api_key_prefix: process.env.RESEND_API_KEY
        ? process.env.RESEND_API_KEY.substring(0, 10) + '...'
        : 'NOT SET',
    },
    
    // Check if keys match expected patterns
    validation: {
      anon_key_starts_with_eyJ: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false,
      service_role_starts_with_eyJ: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false,
      url_is_supabase: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') || false,
    }
  };
  
  return NextResponse.json(envCheck);
}