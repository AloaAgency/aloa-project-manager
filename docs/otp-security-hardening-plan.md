# OTP Security Hardening Plan

## Overview
This document outlines security enhancements for the OTP authentication system to prevent abuse and strengthen security.

## Current Implementation
- 6-digit OTP codes sent via email
- 15-minute expiration window
- Single-use tokens
- Dual verification system (Supabase + custom table)

## Recommended Security Enhancements

### 1. Rate Limiting
**Priority: HIGH**
- Implement IP-based rate limiting for OTP requests
- Maximum 3 OTP requests per email per 15 minutes
- Maximum 5 failed verification attempts before temporary lockout
- 30-minute lockout period after exceeding limits

### 2. OTP Complexity
**Priority: MEDIUM**
- Consider alphanumeric codes for enhanced security
- Increase to 8 characters for password reset (more sensitive)
- Keep 6 digits for login (better UX)

### 3. Attempt Tracking
**Priority: HIGH**
- Create `otp_attempts` table to track:
  - IP address
  - Email
  - Attempt timestamp
  - Success/failure status
  - User agent

### 4. Progressive Delays
**Priority: MEDIUM**
- Add exponential backoff for failed attempts:
  - 1st failure: No delay
  - 2nd failure: 5 second delay
  - 3rd failure: 15 second delay
  - 4th failure: 30 second delay
  - 5th failure: Account locked for 30 minutes

### 5. IP Reputation Checking
**Priority: LOW**
- Integrate with IP reputation services
- Block known VPN/proxy IPs for sensitive operations
- Require additional verification for suspicious IPs

### 6. Device Fingerprinting
**Priority: MEDIUM**
- Track device fingerprints for anomaly detection
- Alert users of logins from new devices
- Require additional verification for unrecognized devices

### 7. Audit Logging
**Priority: HIGH**
- Log all OTP operations with:
  - Timestamp
  - IP address
  - User agent
  - Success/failure
  - OTP type (login/reset)
- Store in `aloa_security_audit_log` table

### 8. Email Notifications
**Priority: MEDIUM**
- Notify users of:
  - Successful password changes
  - Multiple failed OTP attempts
  - Login from new location/device

### 9. CAPTCHA Integration
**Priority: LOW**
- Add CAPTCHA after 2 failed attempts
- Use for password reset requests
- Consider invisible CAPTCHA for better UX

### 10. Session Security
**Priority: HIGH**
- Implement secure session rotation
- Force re-authentication for sensitive operations
- Add session timeout (configurable per role)

## Implementation Timeline

### Phase 1 (Immediate)
- [ ] Rate limiting
- [ ] Attempt tracking
- [ ] Audit logging

### Phase 2 (Next Sprint)
- [ ] Progressive delays
- [ ] Email notifications
- [ ] Session security improvements

### Phase 3 (Future)
- [ ] Device fingerprinting
- [ ] IP reputation checking
- [ ] CAPTCHA integration

## Database Schema Changes

### New Tables Required

```sql
-- OTP attempt tracking
CREATE TABLE aloa_otp_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  attempt_type TEXT NOT NULL, -- 'login' or 'reset'
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security audit log
CREATE TABLE aloa_security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES aloa_user_profiles(id),
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limit tracking
CREATE TABLE aloa_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP or email
  action TEXT NOT NULL, -- 'otp_request', 'otp_verify', etc.
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ
);
```

## API Endpoint Updates

### `/api/auth/send-otp`
- Add rate limiting check
- Log attempt in audit table
- Implement progressive delay

### `/api/auth/verify-otp`
- Track verification attempts
- Implement account locking
- Add device fingerprint validation

### `/api/auth/verify-otp-reset`
- Same as verify-otp
- Additional security for password changes
- Force session rotation after password reset

## Environment Variables

```env
# Rate limiting
RATE_LIMIT_OTP_REQUESTS=3
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_LOCKOUT_MINUTES=30

# OTP Configuration
OTP_LENGTH_LOGIN=6
OTP_LENGTH_RESET=8
OTP_EXPIRY_MINUTES=15

# Security
ENABLE_DEVICE_FINGERPRINT=true
ENABLE_IP_REPUTATION=false
ENABLE_CAPTCHA=false
```

## Testing Requirements

### Security Testing
- [ ] Test rate limiting effectiveness
- [ ] Verify OTP expiration
- [ ] Test account lockout mechanism
- [ ] Validate audit logging

### Performance Testing
- [ ] Load test with rate limiting
- [ ] Database query optimization
- [ ] Session management under load

### User Experience Testing
- [ ] Test progressive delays
- [ ] Verify email notifications
- [ ] Test error messages clarity

## Monitoring & Alerts

### Key Metrics
- OTP request rate per IP
- Failed verification attempts
- Account lockouts
- Average verification time

### Alert Thresholds
- > 10 failed attempts from single IP in 5 minutes
- > 50 OTP requests in 1 hour
- Sudden spike in lockouts
- Unusual geographic patterns

## Rollback Plan

If issues occur after deployment:
1. Disable rate limiting via environment variable
2. Increase limits temporarily
3. Clear lockout records
4. Revert to previous version if critical

## Success Criteria
- 90% reduction in brute force attempts
- < 0.1% false positive rate for lockouts
- No increase in legitimate user friction
- Complete audit trail for all auth events