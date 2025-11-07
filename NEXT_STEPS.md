# Prototype Review – Next Steps

Anchor
- Branch: `prototype_viewer_implementation`
- Last commit: `a40633a` (private storage + signed URLs; comments API/UI; CSP allowlist; signed-url refresh endpoint; save states; storage/timeline policy fixes)

What’s done
- Private Supabase Storage for prototypes + signed URLs everywhere
- Upload/List/Delete APIs updated for private bucket
- Comments API wired (GET/POST/PATCH/DELETE) + UI integration
- Signed-URL refresh endpoint for expired links in review window
- CSP frame-src allowlist updated (Figmas/Vercel/Netlify; InVision removed)
- UI: loading/saving indicators; disabled actions while saving
- SQL scripts made consistent with `project_id` and `aloa_user_profiles`

Immediate tasks (pick up here)
1) Verify storage privacy/policies
   - Bucket `prototype-files` is Private
   - Policies applied (view/upload/update/delete for project members/admins)
   - If needed, re-run: `supabase/setup_prototype_storage_bucket.sql`

2) E2E test
   - Upload prototype (UI or `POST /api/aloa-projects/{projectId}/prototypes/upload`)
   - Open review window and add/reply/resolve/delete comments
   - Confirm `aloa_prototypes` counters update and `aloa_project_timeline` entries appear

3) Optimistic UI updates (comments)
   - Immediately reflect add/reply/resolve/delete in UI, then refetch to confirm
   - Keep disabled states to prevent double submits

4) Periodic signed-URL refresh (optional)
   - In review page, set timer to refresh signed URL every ~4–5 hours for long sessions

5) Embed allowlist
   - Add any prototype hosts to `.env.local` via `NEXT_PUBLIC_ALLOWED_FRAME_SRC` (comma-separated)

6) SQL policy consistency (ongoing)
   - Replace any remaining legacy `profiles` references with `aloa_user_profiles`

Notes
- Signed URL TTL currently 6h in APIs; adjust if needed
- Deletion uses stored storage key, not URL
- Comments migration is idempotent (adds missing `comment_number` if absent)

Quick verify commands (optional)
- List policies for storage objects:
  `select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects';`
- Check timeline policies:
  `select policyname, cmd from pg_policies where tablename='aloa_project_timeline';`

