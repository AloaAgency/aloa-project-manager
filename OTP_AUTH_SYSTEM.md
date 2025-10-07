# OTP Authentication System

This document describes the new OTP (One-Time Password) authentication system that provides an alternative to the problematic PKCE/magic link flow.

## Overview

The OTP system uses 6-digit verification codes sent via email as an alternative authentication method. This bypasses the issues with Supabase's PKCE flow and email client prefetching that were causing authentication failures.

## Architecture

### Database
- **Table**: `password_reset_tokens`
  - Stores OTP codes with expiration timestamps
  - Supports both login and password reset flows
  - Auto-cleanup of expired tokens via scheduled function
  - Location: `/supabase/create_password_reset_tokens_table.sql`

### Frontend Pages

#### 1. Password Reset with OTP
- **Path**: `/app/auth/reset-password-otp/page.js`
- **Flow**:
  1. User enters email address
  2. 6-digit OTP sent to email
  3. User enters OTP code
  4. User sets new password
  5. Redirects to login on success

#### 2. Login with OTP
- **Path**: `/app/auth/login-otp/page.js`
- **Flow**:
  1. User enters email address
  2. 6-digit OTP sent to email
  3. User enters OTP code
  4. Automatic login and redirect based on role
  5. Handles multi-project selection for client users

### Backend API Routes

#### 1. Send OTP
- **Path**: `/app/api/auth/send-otp/route.js`
- **Method**: POST
- **Body**: `{ email: string, type: 'recovery' | 'magiclink' }`
- **Features**:
  - Generates random 6-digit code
  - Validates user exists before sending
  - Uses Supabase's built-in OTP system as primary method
  - Stores backup in custom table for reliability
  - 15-minute expiration window

#### 2. Verify OTP for Password Reset
- **Path**: `/app/api/auth/verify-otp-reset/route.js`
- **Method**: POST
- **Body**: `{ email: string, token: string, newPassword: string, type: 'recovery' }`
- **Features**:
  - Verifies OTP code against Supabase
  - Falls back to custom table if needed
  - Updates password using Admin API
  - Cleans up used tokens
  - Logs password reset event

#### 3. Verify OTP for Login
- **Path**: `/app/api/auth/verify-otp/route.js`
- **Method**: POST
- **Body**: `{ email: string, token: string, type: 'magiclink' }`
- **Features**:
  - Verifies OTP code
  - Creates authenticated session
  - Sets HTTP-only cookies for security
  - Role-based redirect logic
  - Handles multi-project scenarios

## Integration

### Login Page Integration
The main login page (`/app/auth/login/page.js`) already includes:
- Link to OTP login: `/auth/login-otp` (line 432)
- Link to OTP password reset: `/auth/reset-password-otp` (line 513)

### User Flow Options

1. **Password Login** (existing)
   - Email + Password → Dashboard

2. **OTP Login** (new)
   - Email → 6-digit code → Dashboard

3. **Password Reset** (new)
   - Email → 6-digit code → New Password → Login

## Security Features

1. **Token Expiration**: All OTP codes expire after 15 minutes
2. **Single Use**: Tokens are deleted after successful verification
3. **HTTP-Only Cookies**: Session tokens stored in secure cookies
4. **Rate Limiting**: Consider adding rate limiting to prevent abuse
5. **Dual Verification**: Uses both Supabase OTP and custom table for reliability

## Advantages Over Magic Links

1. **No PKCE Issues**: Bypasses the problematic PKCE flow entirely
2. **No Email Prefetching**: 6-digit codes not affected by email client previews
3. **User-Friendly**: Simple, familiar UX pattern
4. **Reliable**: Dual verification system ensures high success rate
5. **Secure**: Tokens expire quickly and are single-use

## Testing the System

### 1. Test Password Reset
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
    "newPassword": "newpassword123",
    "type": "recovery"
  }'
```

### 2. Test OTP Login
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
    "token": "123456",
    "type": "magiclink"
  }'
```

## Database Setup

Ensure the `password_reset_tokens` table exists:

```sql
-- Run this in Supabase SQL Editor
-- Location: /supabase/create_password_reset_tokens_table.sql

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
```

## Future Enhancements

1. **Rate Limiting**: Add IP-based rate limiting to prevent abuse
2. **SMS Support**: Extend to support SMS-based OTP delivery
3. **2FA Integration**: Use OTP as second factor for existing password logins
4. **Analytics**: Track OTP success rates and failure reasons
5. **Customizable Expiration**: Allow different expiration times based on use case

## Troubleshooting

### Issue: OTP not received
- Check email is valid and user exists in `aloa_user_profiles`
- Verify Supabase email settings are configured
- Check spam folder

### Issue: Invalid or expired code
- Codes expire after 15 minutes
- Each code is single-use only
- Check `password_reset_tokens` table for active tokens

### Issue: Session not persisting after login
- Verify cookies are being set correctly
- Check browser cookie settings (must allow HTTP-only cookies)
- Ensure HTTPS in production for secure cookies

## Migration from Old System

To migrate users from the old magic link system:

1. Both systems can coexist - no breaking changes
2. Users can choose preferred method via login page tabs
3. Gradually phase out magic link by promoting OTP login
4. Monitor success rates and user feedback
5. Eventually deprecate magic link option
