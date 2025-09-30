# API Service Client Audit (Phase 7 Step 7.1)

**Status:** Complete (last updated 2025-10-01)

Phase 7 Step 7.1 requires every API route to use the correct Supabase client helper:

- `createServiceClient()` for admin/system operations that need the service role.
- `createServerClient()` (with cookies) for user-scoped requests so RLS sees `auth.uid()`.
- No direct imports from `@/lib/supabase` (anon client) should remain.

## Outstanding Routes
All API routes now rely on the shared service/server helpers—no direct `@/lib/supabase` usage remains.

## Next Actions
- Run the Supabase security advisor to confirm the helper migration cleared remaining warnings.
- Keep this document updated if new routes are added or legacy endpoints are reintroduced.
