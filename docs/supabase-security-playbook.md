# Supabase Security Playbook (Vibe Projects)

*Last updated: 2025*

## 🧠 Principles & Mindset

1. **Default deny / least privilege**  
   Never assume anything is trusted. Every policy, endpoint, and interaction should start with “deny by default,” then explicitly allow minimal required permissions.

2. **Defense in depth**  
   Use multiple layers — e.g. RLS (Row-Level Security), function-level checks, JWT claims, and optional additional server-side checks. Don’t rely on just one layer.

3. **Fail securely / fail closed**  
   If something goes wrong (e.g. missing claim, malformed token), default to rejecting.

4. **Explicit is better than implicit**  
   Avoid hidden “magic” behavior or unclear defaults. Make your security rules and logic visible and auditable.

5. **Keep secrets… secret**  
   Avoid pushing keys, service tokens, or other sensitive config into client-side logic or version control.

---

## Security Checklist & Best Practices

Below is a “checklist + explanation” you should run through in every new Supabase-powered project.

| Area | Must‑do / Check | Why / Common Pitfall | Comments / Extensions |
|---|---|---|---|
| **Project / Configuration** | Rotate keys and default secrets after project creation | The default project keys, anon key, etc. may be known or weak | Use environment variables; never embed keys in front-end code or repo |
|  | Use **Service Role** only in secure backend contexts | The service-role key has power to bypass RLS, so exposure is catastrophic | Isolate backend functions or serverless endpoints; never expose in mobile or frontend |
|  | Use separate “staging / dev / prod” environments | Prevent leaks in dev from endangering prod | Use different projects or at least distinct credentials / policies |
| **Authentication / JWT / Claims** | Validate issuer/audience, expiry, etc. | If you trust a token blindly, attackers might craft one | Ensure backend or Supabase SDK verifies token properly |
|  | Include custom claims / roles (e.g. `role`, `user_id`, `org_id`) | Enables granular access control logic downstream | But don’t rely *just* on client-provided claims — verify or map them |
|  | Don’t trust `role = authenticated` only | That’s too coarse-grained | Use additional attributes or role hierarchy |
| **Row-Level Security (RLS)** | Enable RLS on all tables (except ones truly open) | Without RLS, any authenticated user (or worse, anon) may read/write everything | Always test with “least access” accounts |
|  | Write policies carefully with `using` and `with check` | Common error: a `SELECT` policy that implicitly allows more than intended | Use strict conditions, and test edge cases |
|  | Avoid use of `ALLOW` fallback policies or “catch-all allow” | Too permissive; defeats RLS intent | Be explicit per action (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) |
| **Stored Functions / RPC / Edge Functions** | Use `SET LOCAL ROLE` or proper context switching inside Postgres functions | If you use `security definer`, it may bypass RLS entirely if misconfigured | Be cautious with `security definer` privileges |
|  | Validate inputs inside RPCs/functions | You can’t assume that only “good” clients call them | Use strong parameter validation, checks & limit logic |
| **API / Endpoints / Edge Functions** | Validate authorization upstream | Don’t assume that incoming requests are already sufficiently scoped | Check JWT, roles, claims before doing critical actions |
|  | Rate limiting, quotas, throttling | To guard against abuse or DoS | Even “good” users may be compromised |
|  | Sanitize / validate all input — in web APIs | Prevent injection, mass updates, content poisoning | Don’t just depend on Supabase or Postgres protections |
| **Storage / File Access** | Use signed URLs / pre-signed URLs with short expiry | Don’t expose public buckets if you can avoid it | Control read/write on storage via RLS or via middle-tier logic |
| **Audit, Logging, Monitoring** | Enable all relevant logs (auth, SQL, etc.) | Blind spots are where attacks hide | Monitor for “unusual queries” (e.g. full-table scans, deletes) |
|  | Periodically review roles, policies, service accounts | Over time, drift and “just in case” things accumulate | Clean up stale permissions |
| **Secrets & Configuration** | Use secret management (env vars or vault) | Hardcoding secrets is a big red flag | Don’t commit `.env` files; use CI/CD secret stores |
| **Backups, Disaster Recovery** | Encrypted backups, stored off-site or with secure ACLs | Backups often forgotten and then become an easy target | Test recovery processes |
| **Dependency / Library Safety** | Keep Supabase SDK, Postgres drivers, etc. up to date | Vulnerabilities get patched; regressions happen | Regular dependency audits / vulnerability scanning |
| **Third-Party Integrations** | Minimize or vet integrations with full DB access | A compromised integration could become a pivot into your DB | Use least privilege when granting API access / webhooks |

---

## Common Pitfalls & Anti‑Patterns (and How to Avoid)

| Mistake | Why It’s Dangerous | Mitigation / What to Watch Out For |
|---|---|---|
| Exposing the **service role key** in frontend | That key bypasses all RLS — instant full DB compromise | Use server-only contexts; audit your code for accidental leaks |
| Relying on client-side role logic | Clients can lie / be tampered with | Always re-check / re-derive critical attributes server-side |
| Lax `INSERT` / `UPDATE` policies without filtering | A user could inject or modify rows they shouldn’t | In `with check` or `using`, always compare to `auth.uid()` or claim-based columns |
| Overly broad RLS rules (e.g. `user_id = auth.uid()` only) when multiple scopes (org, project) exist | Doesn’t handle hierarchical or multi-tenant models | Use context-aware RLS referencing `org_id` or join with membership tables |
| Using `security_definer` functions that don’t properly drop privileges | They may let attackers circumvent RLS | Use `security_invoker` where possible; if using `definer`, be very strict about user checks |
| Turning off RLS for convenience in dev, then forgetting to re-enable in prod | Dev leakage becomes production vulnerability | Automate environment parity checks |
| Granting wide privileges to “anonymous / public / anon” role | Many tutorials do this; it’s very risky | Only allow truly non-sensitive read operations (if needed), otherwise avoid |
| Not validating uploaded file types or sizes | Malicious uploads (e.g. scripts, viruses) | Use strict validation, scanning, content-type enforcement |
| Ignoring edge cases (nulls, missing claims, expired tokens) | Attackers explore edge behavior | Always code defensively, with worst-case defaults = deny |

---

## Proposed Standard Template / Boilerplate for Vibe Projects

```sql
-- Example RLS template (Postgres / Supabase)
-- Adjust columns per your schema (e.g. org_id, owner_id, etc.)

-- 1. Enable RLS
ALTER TABLE my_schema.my_table ENABLE ROW LEVEL SECURITY;

-- 2. Revoke fallback or blanket permissions
REVOKE ALL ON my_schema.my_table FROM public;
REVOKE ALL ON my_schema.my_table FROM anon;
REVOKE ALL ON my_schema.my_table FROM authenticated;

-- 3. Grants for usage (if needed for non-critical public reads)
-- e.g. allow safe SELECT of public metadata (be careful)
-- GRANT SELECT ON my_schema.my_table TO public;

-- 4. Policies for SELECT
CREATE POLICY select_own
  ON my_schema.my_table
  FOR SELECT
  USING (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND another_filter = true
  );

-- 5. Policies for INSERT
CREATE POLICY insert_own
  ON my_schema.my_table
  FOR INSERT
  WITH CHECK (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND owner_id = current_setting('request.jwt.claims.user_id')::uuid
  );

-- 6. Policies for UPDATE
CREATE POLICY update_own
  ON my_schema.my_table
  FOR UPDATE
  USING (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND owner_id = current_setting('request.jwt.claims.user_id')::uuid
  )
  WITH CHECK (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND owner_id = current_setting('request.jwt.claims.user_id')::uuid
  );

-- 7. Policies for DELETE
CREATE POLICY delete_own
  ON my_schema.my_table
  FOR DELETE
  USING (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND owner_id = current_setting('request.jwt.claims.user_id')::uuid
  );
```

---

## Audit Questions Before Launch / Deployment

- Are there any tables not covered by **explicit RLS policies**?  
- Are all service-role keys isolated to backend-only?  
- Can a JWT without proper custom claims do significant harm?  
- Do any API / edge routes bypass claim validation?  
- Are any storage buckets publicly exposed or mis‑configured?  
- Do our logs / alerts cover SQL errors, failed access, unusual query patterns?  
- Have we reviewed our third-party integrations and their permissions?  
- Do we have a rollback / revocation plan if keys / tokens are leaked?
