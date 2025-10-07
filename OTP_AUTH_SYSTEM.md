# OTP Authentication System

This document describes the OTP (One-Time Password) authentication system that serves as an alternative to the PKCE/magic-link flow that previously caused sign-in issues.

## Overview

The OTP system delivers 6-digit verification codes via email. Users enter the code in the app to complete login or reset their password, avoiding the unreliable magic-link experience some email clients interfered with.

## Architecture

### Supabase
- Supabase Auth sends and verifies the OTP codes via `signInWithOtp` and `verifyOtp`.
- No custom fallback storage is used; verification succeeds only if Supabase validates the token.
- OTP expiration and single-use enforcement are handled by Supabase (default 5-minute lifetime, configurable in the dashboard).
- Application-side rate limiting guards throttle and lock abusive traffic before calling Supabase.

### Frontend Pages

#### Password Reset with OTP
- **Path**: `/app/auth/reset-password-otp/page.js`
- **Flow**: Email → receive code → enter code → set new password → redirect to login.

#### Login with OTP
- **Path**: `/app/auth/login-otp/page.js`
- **Flow**: Email → receive code → enter code → dashboard redirect (role aware).

### Backend API Routes

#### `/api/auth/send-otp`
- Validates email format and confirms the account exists.
- Calls `supabase.auth.signInWithOtp` with `shouldCreateUser: false` so only existing accounts can receive codes.

#### `/api/auth/verify-otp`
- Accepts `{ email, token }`.
- Delegates verification to `supabase.auth.verifyOtp` (type `magiclink`).
- Sets Supabase session cookies (`sb-access-token`, `sb-refresh-token`) on success and redirects based on role.

#### `/api/auth/verify-otp-reset`
- Accepts `{ email, token, newPassword }`.
- Uses `supabase.auth.verifyOtp` (type `email`) to validate the code.
- Updates the password via `supabase.auth.admin.updateUserById` when verification succeeds.
- Logs the password reset event in `aloa_project_timeline`.

## Security Practices

1. **Supabase Enforcement**: Codes expire quickly and are single-use because Supabase manages issuance/verification.
2. **HTTP-Only Cookies**: Login establishes a session using secure, HTTP-only cookies.
3. **Rate Limiting & Lockouts**: `/api/auth/send-otp` and verification endpoints enforce in-memory per-email/per-IP throttles (15-minute window) and a 30-minute lock after five failed attempts. Move these guards to a shared store for horizontal scaling.
4. **User Enumeration Mitigation** (planned): API responses will be normalized so the presence of an account is not disclosed.
5. **Cryptographic RNG** (planned): OTP generation remains fully within Supabase; if we self-generate codes in the future, we will use `crypto.randomInt`.

## Supabase Email Template Configuration

Supabase uses the **Magic Link** email template for these OTP messages. To ensure the code is visible to users:

1. Navigate to Supabase Dashboard → Authentication → Email Templates.
2. Edit the **Magic Link** template.
3. Include `{{ .Token }}` in the email body, e.g.

```html
<p>Your verification code is: <strong>{{ .Token }}</strong></p>
<p>This code will expire shortly and can only be used once.</p>
```

## Testing the System

### Password Reset
```bash
# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "type": "recovery"}'

# Verify and reset
curl -X POST http://localhost:3000/api/auth/verify-otp-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "123456",
    "newPassword": "newpassword123"
  }'
```

### OTP Login
```bash
# Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "type": "magiclink"}'

# Verify and login
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "123456"
  }'
```

## Future Enhancements

- Add rate limiting and lockouts to defend against brute-force guessing.
- Normalize responses to avoid revealing whether an email is registered.
- Evaluate removing the client-readable `user-id` cookie.
- Add automated tests covering success, expired code, wrong code, and lockout scenarios.
- Monitor OTP success/failure metrics to detect abuse or regressions.

## Troubleshooting

- **OTP not received**: Confirm the user exists, email address is correct, and the Supabase email template is enabled.
- **Invalid or expired code**: Codes expire quickly; request a new OTP and ensure the code matches exactly.
- **Session missing after login**: Check that cookies are enabled and the application is running over HTTPS in production.
