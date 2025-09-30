# API Service Client Audit (Phase 7 Step 7.1)

**Status:** In progress (last updated 2025-10-01)

Phase 7 Step 7.1 requires every API route to use the correct Supabase client helper:

- `createServiceClient()` for admin/system operations that need the service role.
- `createServerClient()` (with cookies) for user-scoped requests so RLS sees `auth.uid()`.
- No direct imports from `@/lib/supabase` (anon client) should remain.

## Outstanding Routes
The following routes still import `supabase` from `@/lib/supabase` and do **not** use the new helpers. Each must be reviewed and refactored.

```
app/api/aloa-projects/[projectId]/applet-interactions/route.js
app/api/aloa-projects/[projectId]/notifications/route.js
app/api/aloa-projects/[projectId]/projectlets/[projectletId]/applets/[appletId]/route.js
app/api/aloa-projects/[projectId]/projectlets/[projectletId]/applets/reorder/route.js
app/api/aloa-projects/[projectId]/projectlets/[projectletId]/steps/route.js
app/api/aloa-projects/[projectId]/projectlets/reorder/route.js
app/api/aloa-projects/[projectId]/stakeholders/route.js
app/api/aloa-projects/[projectId]/team/route.js
app/api/aloa-projects/debug/route.js
app/api/aloa-projects/initialize/route.js
app/api/aloa-projects/test/route.js
app/api/responses/[responseId]/route.js
app/api/responses/route.js
```

## Next Actions
1. For each route above, decide whether the operation is admin/service-only or user-scoped.
2. Replace the `@/lib/supabase` import with the appropriate helper(s).
3. Add authentication/authorization checks where missing (e.g. ensure only admins hit service operations).
4. After refactoring, rerun the Supabase security advisor to confirm warnings clear.

Track progress by checking off routes in this file (or another tracking tool) as they're migrated.
