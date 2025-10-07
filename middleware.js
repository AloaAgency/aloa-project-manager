import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createServerClient } from '@supabase/ssr';

// Rate limiting implementation
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMITS = {
  '/api/responses': { max: 10, window: RATE_LIMIT_WINDOW }, // 10 form submissions per minute
  '/api/forms/upload': { max: 5, window: RATE_LIMIT_WINDOW }, // 5 file uploads per minute
  '/api/ai-analysis': { max: 5, window: RATE_LIMIT_WINDOW }, // 5 AI analysis requests per minute
  default: { max: 100, window: RATE_LIMIT_WINDOW } // 100 requests per minute for other endpoints
};

function getRateLimit(pathname) {
  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return limit;
    }
  }
  return RATE_LIMITS.default;
}

function checkRateLimit(ip, pathname) {
  const key = `${ip}:${pathname}`;
  const limit = getRateLimit(pathname);
  const now = Date.now();
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + limit.window });
    return true;
  }
  
  const record = requestCounts.get(key);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + limit.window;
    return true;
  }
  
  if (record.count >= limit.max) {
    return false;
  }
  
  record.count++;
  return true;
}

// Note: In production, use a proper cache like Redis for rate limiting
// The Map will be cleared on server restart

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const { pathname } = request.nextUrl;
  
  // Skip Supabase client creation for auth callback routes to prevent token consumption
  // BUT allow it for verify-reset since that page doesn't consume tokens
  const isAuthCallbackRoute = (pathname.startsWith('/auth/callback') ||
                               pathname.startsWith('/auth/update-password')) &&
                               !pathname.startsWith('/auth/verify-reset');

  if (isAuthCallbackRoute) {
    // Don't create Supabase client, but continue to set security headers below
  }

  // Authentication check for protected routes (skip for auth callback routes)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!isAuthCallbackRoute && supabaseUrl && supabaseKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            // Ensure proper cookie settings for production
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieOptions = {
              name,
              value,
              ...options,
              sameSite: 'lax', // Always use 'lax' for auth cookies
              secure: isProduction,
              httpOnly: true,
              path: '/',
              // Don't set domain to allow proper cookie handling
            };
            request.cookies.set(cookieOptions);
            response.cookies.set(cookieOptions);
          },
          remove(name, options) {
            const removeOptions = {
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/'
            };
            request.cookies.set(removeOptions);
            response.cookies.set(removeOptions);
          },
        },
      }
    );

    // Try to get session instead of user (more reliable for middleware)
    let session = null;
    let user = null;
    let sessionError = null;

    // Skip expensive session check if we're already on auth pages
    // This prevents unnecessary Supabase calls during auth cleanup
    if (pathname.startsWith('/auth/')) {
      // On auth page - skip session check to avoid delays
      // We'll let the page handle auth itself
    } else {
      try {
        // First try to get the session
        const { data, error } = await supabase.auth.getSession();
        sessionError = error;

        if (!error && data?.session) {
          session = data.session;
          user = session.user;
        } else if (!error && !data?.session) {
          // No session but no error - might be a cookie sync issue
          // Try to refresh the session if we have auth cookies
          const authCookies = request.cookies.getAll().filter(cookie =>
            cookie.name.includes('sb-') && cookie.name.includes('auth-token')
          );

          if (authCookies.length > 0) {
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && refreshData?.session) {
                session = refreshData.session;
                user = session.user;
              }
            } catch (refreshErr) {
              // Session refresh failed
            }
          }
        }
      } catch (e) {
        sessionError = e;
      }
    }

    // Check for auth cookies
    const authCookies = request.cookies.getAll().filter(cookie =>
      cookie.name.includes('sb-') ||
      cookie.name.includes('supabase')
    );

    // If there's a session error OR stale session, handle it
    const hasStaleSession = !session && authCookies.length > 0;
    const needsAuthCleanup = sessionError || hasStaleSession;

    // IMPORTANT: If on auth pages already, skip all this logic
    if (pathname.startsWith('/auth/') || pathname.startsWith('/forms/')) {
      // Already on an auth/public page, just let it through
      // This prevents redirect loops
    } else if (needsAuthCleanup) {
      // Not on auth page and have auth issues - redirect
      // Clear all auth-related cookies
      for (const cookie of authCookies) {
        response.cookies.delete(cookie.name);
      }

      // Redirect to login with clear_auth flag
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('clear_auth', '1');
      if (sessionError) {
        redirectUrl.searchParams.set('error', 'session_expired');
      } else if (hasStaleSession) {
        redirectUrl.searchParams.set('error', 'stale_session');
      }
      if (pathname !== '/') {
        redirectUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Get user profile if authenticated
    let userRole = null;
    if (user) {
      const { data: profile } = await supabase
        .from('aloa_user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      userRole = profile?.role;
    }

    // Protected routes that require authentication
    const protectedPaths = [
      '/create',
      '/edit',
      '/responses',
      '/ai-analysis',
      '/admin',
      '/profile',
      '/settings',
      '/project'  // Add project routes as protected
    ];

    const isProtectedPath = protectedPaths.some(path => 
      pathname.startsWith(path)
    );
    
    const clientRoles = ['client', 'client_admin', 'client_participant'];
    const adminRoles = ['super_admin', 'project_admin', 'team_member'];

    // No users should access /dashboard anymore - it's deprecated
    // The /dashboard route itself will handle redirects if someone lands there

    // Auth routes that should redirect if already logged in
    const authPaths = ['/auth/login', '/auth/signup'];
    const isAuthPath = authPaths.some(path => 
      pathname.startsWith(path)
    );

    // If accessing protected route without authentication, redirect to login
    if (isProtectedPath && !user) {
      // Skip redirect if already going to login to avoid loops
      if (!pathname.startsWith('/auth/')) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // If accessing auth routes while authenticated, redirect based on role
    if (isAuthPath && user && userRole) {
      const hasForcedRedirect = request.nextUrl.searchParams.has('redirect');
      const hasAuthenticatedParam = request.nextUrl.searchParams.has('authenticated');

      if (!hasForcedRedirect && !hasAuthenticatedParam) {
        // Only redirect if we have a valid role
        if (adminRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/admin/projects', request.url));
        }
        // For client users, let them stay on auth pages
        // The pages themselves will handle appropriate redirects
      }
    }

    // For the root path, redirect based on auth status and role
    if (pathname === '/') {
      if (user && userRole) {
        if (adminRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/admin/projects', request.url));
        } else if (clientRoles.includes(userRole)) {
          // Client users: add a flag so auth page knows they're authenticated
          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('authenticated', 'true');
          return NextResponse.redirect(loginUrl);
        }
      }
      // Not authenticated or no role - redirect to login
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }
  
  // Get client IP (works with Vercel)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(ip, pathname)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: 60 
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(getRateLimit(pathname).max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_WINDOW)
          }
        }
      );
    }
  }
  
  // Generate and attach CSRF token for state-changing operations
  const csrfToken = request.cookies.get('csrf-token')?.value || nanoid();
  
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vercel.live wss://ws-us3.pusher.com",
    "frame-src 'self' https://vercel.live https://player.vimeo.com https://www.youtube-nocookie.com https://www.youtube.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ];
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Always set CSRF token cookie if it doesn't exist
  if (!request.cookies.get('csrf-token')) {
    response.cookies.set({
      name: 'csrf-token',
      value: csrfToken,
      httpOnly: false, // Allow JavaScript to read it for AJAX requests
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });
  }
  
  // CORS configuration for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'https://custom-forms-xi.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
