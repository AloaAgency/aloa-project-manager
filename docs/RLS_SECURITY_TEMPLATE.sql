-- RLS security template provided by external advisors.
-- Use this as a checklist when designing policies for any new table.

-- 1. Enable Row Level Security on the table
ALTER TABLE my_schema.my_table ENABLE ROW LEVEL SECURITY;

-- 2. Revoke blanket permissions (prevents implicit access)
REVOKE ALL ON my_schema.my_table FROM public;
REVOKE ALL ON my_schema.my_table FROM anon;
REVOKE ALL ON my_schema.my_table FROM authenticated;

-- 3. Optional: add granular GRANT statements for safe public metadata (review carefully)
-- GRANT SELECT ON my_schema.my_table TO public;

-- 4. SELECT policy example
CREATE POLICY select_own
  ON my_schema.my_table
  FOR SELECT
  USING (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND another_filter = true
  );

-- 5. INSERT policy example
CREATE POLICY insert_own
  ON my_schema.my_table
  FOR INSERT
  WITH CHECK (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND owner_id = current_setting('request.jwt.claims.user_id')::uuid
  );

-- 6. UPDATE policy example
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

-- 7. DELETE policy example
CREATE POLICY delete_own
  ON my_schema.my_table
  FOR DELETE
  USING (
    org_id = current_setting('request.jwt.claims.org_id')::uuid
    AND owner_id = current_setting('request.jwt.claims.user_id')::uuid
  );
