-- File: /supabase/security_fix_00_disable_public_signup.sql
-- Purpose: Disable self-service Supabase Auth signups and verify configuration.
-- Run with service-role privileges in Supabase SQL.

-- Disable public signups by restricting auth.users inserts to service role only
-- NOTE: auth.users is managed by Supabase; do not modify table ownership or RLS here.
-- Instead, enforce no self-signup via auth schema functions and by rejecting
-- client-side signUp calls (see lib/supabase-auth.js).
