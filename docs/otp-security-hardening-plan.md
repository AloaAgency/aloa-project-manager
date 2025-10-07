# OTP Security Hardening Plan

## Status Snapshot
- ✅ Legacy OTP fallback removed from API routes (2024-05-16)
- ✅ No `password_reset_tokens` table found in Supabase; fallback was never deployed
- ✅ Application-level rate limiting and lockouts added to OTP verification endpoints (2024-05-16)
- 🔒 Remaining gaps: structured logging, stronger randomness, cookie tightening

## Workstream 1 · Legacy Cleanup
- **Goal**: Eliminate the unused database fallback and its attack surface.
  1. Remove fallback reads/writes from `send-otp`, `verify-otp`, and `verify-otp-reset` handlers. *(Owner: Backend · Status: Completed)*
  2. Remove the unused `supabase/create_password_reset_tokens_table.sql` file (or move to docs) to avoid confusion. *(Owner: Backend · Status: Completed)*

## Workstream 2 · Abuse Prevention
- **Goal**: Stop brute-force and flooding attacks against OTP endpoints.
  1. Add per-IP and per-email throttling on `/api/auth/send-otp` and `/api/auth/verify-otp*` (Redis, Upstash, or Supabase edge functions). *(Owner: Backend · Status: Completed — in-memory guard shipping now; migrate to shared store for multi-instance parity)*
  2. Track failed verifications and lock the email/token pair after N attempts within 15 minutes. *(Owner: Backend · Status: Completed — 5 failures trigger a 30-minute lock)*
  3. Emit structured logs/metrics for rejected requests so security can monitor abuse. *(Owner: SRE · Status: Not started)*

## Workstream 3 · Token Generation & UX
- **Goal**: Ensure OTPs are unpredictable and user messaging does not leak account state.
  1. Replace `Math.random` with `crypto.randomInt` (or server-side equivalent) when generating OTPs. *(Owner: Backend · Status: Not started)*
  2. Return generic responses (“If an account exists…”) from `/api/auth/send-otp` and update UI copy to match. *(Owner: Frontend · Status: Not started)*
  3. Document Supabase template behavior so support can confirm the correct code format is being delivered. *(Owner: Support · Status: Not started)*

## Workstream 4 · Session & Cookie Hardening
- **Goal**: Reduce damage from compromised clients or XSS.
  1. Evaluate removing the `user-id` non-HTTP-only cookie in favor of server-derived data. *(Owner: Backend · Status: Not started)*
  2. Enforce session rotation on password reset and other high-risk flows. *(Owner: Backend · Status: Not started)*
  3. Add automated tests to confirm cookies are HttpOnly/SameSite/secure in production. *(Owner: QA · Status: Not started)*

## Validation Checklist
- [ ] Supabase audit confirms the fallback table is gone or locked down.
- [ ] Rate limiting and lockouts behave correctly under load tests.
- [ ] Automated tests cover success, expired token, wrong token, and lockout scenarios.
- [ ] Manual end-to-end smoke tests (login + password reset) pass in staging after changes.

## Coordination & Timeline
- Prioritize Workstreams 1 (table removal) and 2 (rate limiting) in the current sprint.
- Tackle Workstreams 3 and 4 next sprint once telemetry is in place.
- Notify security/compliance before dropping the Supabase table.
