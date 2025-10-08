# OTP Authentication with Supabase - Lessons Learned

## Overview
This document captures key insights and best practices learned from implementing OTP (One-Time Password) authentication with Supabase in a Next.js application.

## Why OTP Over Magic Links?

### Problems with Magic Links
1. **PKCE Flow Issues**: Magic links often trigger PKCE (Proof Key for Code Exchange) errors like "invalid request: both auth code and code verifier should be non-empty"
2. **Email Client Prefetching**: Many email clients (Gmail, Outlook) prefetch links for security scanning, consuming the one-time token before the user clicks
3. **Browser Confusion**: Links open in default browser, not necessarily where user initiated the request
4. **Token Expiration**: Links can expire before user checks email

### OTP Advantages
1. **No PKCE Complexity**: Simple code verification bypasses PKCE flow entirely
2. **Prefetch Immune**: Email clients can't "consume" a 6-digit code
3. **Browser Agnostic**: User enters code in same browser where they started
4. **Better UX**: Users understand entering codes (familiar from 2FA)

## Implementation Architecture

### Key Components

#### 1. Send OTP Endpoint (`/api/auth/send-otp`)
```javascript
// Critical: Use service role client for OTP operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY // Service role key required
);

// Send OTP with proper type
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false, // Prevent accidental user creation
    data: { type: 'login' }  // or 'recovery' for password reset
  }
});
```

#### 2. Verify OTP Endpoint (`/api/auth/verify-otp`)
```javascript
// Verify the OTP
const { data: verifyData, error } = await supabase.auth.verifyOtp({
  email,
  token,
  type: 'magiclink' // Use 'magiclink' even for OTP codes
});

// CRITICAL: Set session cookies manually for SSR
const cookieStore = cookies();
if (verifyData?.session) {
  // Create server client with cookie handling
  const serverSupabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name) {
        cookieStore.set({ name, value: '', maxAge: 0 });
      }
    }
  });

  // This sets the auth cookies properly
  await serverSupabase.auth.setSession({
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token
  });
}
```

## Critical Lessons Learned

### 1. Session Cookie Management
**Problem**: After OTP verification, session wasn't immediately available to middleware/AuthGuard components.

**Solution**:
- Manually set session cookies in the verify endpoint
- Use `createServerClient` with cookie handlers
- Set both access and refresh tokens

### 2. Middleware Redirect Issues
**Problem**: Middleware would redirect to login immediately after successful OTP login because session wasn't recognized yet.

**Solution**:
```javascript
// Set a temporary "just-logged-in" cookie
cookieStore.set('just-logged-in', '1', {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 10, // Short-lived: 10 seconds
  path: '/'
});

// In middleware, check for this cookie
const justLoggedIn = request.cookies.get('just-logged-in');
if (justLoggedIn) {
  // Skip auth cleanup, allow session to establish
  return response;
}
```

### 3. Client-Side Session Sync
**Problem**: Client-side Supabase instance doesn't immediately recognize the new session.

**Solution**:
```javascript
// After successful OTP verification, sync client session
const { createClient } = await import('@/lib/supabase-auth');
const supabase = createClient();

// Clear stale session first
await supabase.auth.signOut({ scope: 'local' });

// Set new session
await supabase.auth.setSession({
  access_token: data.session.access_token,
  refresh_token: data.session.refresh_token
});

// Wait for session to be recognized
const deadline = Date.now() + 1000;
while (Date.now() < deadline) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) break;
  await new Promise(r => setTimeout(r, 100));
}
```

### 4. Rate Limiting
**Problem**: OTP endpoints vulnerable to brute force attacks.

**Solution**: Implement progressive rate limiting with lockouts:
```javascript
// Track failures by email and IP
const failures = new Map();

function enforceRateLimits(email, ip) {
  const attempts = failures.get(email) || 0;

  if (attempts >= 10) {
    // 30-minute lockout after 10 failures
    return { blocked: true, retryAfter: 1800 };
  }

  if (attempts >= 5) {
    // 5-minute cooldown after 5 failures
    return { blocked: true, retryAfter: 300 };
  }

  return { blocked: false };
}
```

### 5. Database Column Naming
**Problem**: Inconsistent column names between auth tables and user profile tables.

**Issue Found**: `aloa_user_profiles.auth_user_id` doesn't exist - it's just `id` that matches `auth.users.id`

**Solution**: Always verify column names in Supabase dashboard before querying.

### 6. Navigation Timing Issues
**Problem**: Brief flash of login page during redirect after OTP verification.

**Attempted Solutions**:
1. ✅ Direct redirect to final destination (skip `/dashboard`)
2. ✅ Add "just-logged-in" cookie to prevent middleware redirects
3. ✅ Implement retry logic in AuthGuard for fresh logins
4. ✅ Use `window.location.replace()` for hard redirect
5. ⚠️ Browser may still show cached content briefly (Safari especially)

**Best Practice**: Accept that some browser rendering artifacts may occur during full page navigation. Focus on preventing actual redirects rather than visual artifacts.

## Security Considerations

### 1. Service Role Key Usage
- **Required for**: OTP operations, admin functions
- **Never expose**: Keep in server-side code only
- **Environment variable**: Use `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

### 2. OTP Code Security
- **Expiration**: 15-minute default (configurable)
- **Single use**: Codes invalidated after successful use
- **Rate limiting**: Essential to prevent brute force
- **Hash storage**: Codes stored hashed in database

### 3. Session Security
- **HTTP-only cookies**: Prevent XSS attacks
- **Secure flag**: Required in production
- **SameSite**: Set to 'lax' for CSRF protection
- **Refresh tokens**: Handle rotation properly

## Common Pitfalls to Avoid

1. **Don't use** `getUserByEmail` - it doesn't exist in Supabase auth admin API
2. **Don't skip** manual cookie setting in verify endpoint
3. **Don't assume** session is immediately available after verification
4. **Don't forget** to handle both 'magiclink' and 'recovery' OTP types
5. **Don't cache** authentication pages aggressively
6. **Don't use** `.catch()` directly on Supabase queries (use try/catch blocks)

## Recommended Flow

### For Login
1. User enters email → Send OTP
2. User enters code → Verify OTP
3. Set session cookies manually
4. Set "just-logged-in" flag
5. Redirect with `window.location.replace()`

### For Password Reset
1. User enters email → Send OTP (type: 'recovery')
2. User enters code → Verify OTP
3. Update password using `auth.admin.updateUserById()`
4. Clear all sessions for security
5. Redirect to login

## Testing Checklist

- [ ] Test in private/incognito mode
- [ ] Test with different browsers (especially Safari)
- [ ] Test rate limiting (5 failures, 10 failures)
- [ ] Test OTP expiration (wait 15+ minutes)
- [ ] Test concurrent login attempts
- [ ] Test password reset flow
- [ ] Test middleware bypass with "just-logged-in" cookie
- [ ] Test session persistence after redirect

## Supabase Email Template Configuration

### Where to Configure
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Configure both Magic Link and Password Reset templates

### Magic Link Template (for OTP Login)

**Subject**: `Your Login Code`

**Body HTML**:
```html
<h2>Verification Code</h2>

<p>Here is your 6-digit verification code:</p>

<h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px;">
  {{ .Token }}
</h1>

<p>Enter this code on the website to continue.</p>

<p style="color: #666;">This code will expire in 60 minutes.</p>

<p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
```

### Password Reset Template

**Subject**: `Reset Your Password`

**Body HTML**:
```html
<h2>Password Reset Code</h2>

<p>You requested to reset your password. Use this verification code:</p>

<h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px;">
  {{ .Token }}
</h1>

<p>This code will expire in 10 minutes.</p>

<p>If you didn't request this, you can safely ignore this email.</p>
```

### Important Template Notes
- Use `{{ .Token }}` to display the OTP code
- Magic Link template is used for login OTPs
- Password Reset template is used for password reset OTPs
- Expiry times are controlled by Supabase settings, not the template
- Keep styling simple and inline for email client compatibility

## Environment Variables Required

```env
# Supabase - Use NEW key format only
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_[key]
SUPABASE_SECRET_KEY=sb_secret_[key]  # Critical for OTP

# Optional but recommended
NEXT_PUBLIC_OTP_EXPIRY_MINUTES=15
NEXT_PUBLIC_MAX_OTP_ATTEMPTS=5
```

## Summary

OTP authentication with Supabase requires careful attention to:
1. Session cookie management (manual setting required)
2. Middleware timing (use temporary flags)
3. Client-server session sync
4. Rate limiting for security
5. Proper error handling

The key insight is that Supabase's default session handling isn't sufficient for SSR apps - you must manually manage cookies and handle timing issues between server and client session establishment.