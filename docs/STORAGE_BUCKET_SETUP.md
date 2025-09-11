# Storage Bucket Setup Instructions

## Fix "violated row level security policy" Error

Since we can't modify storage policies via SQL (ERROR: must be owner of table objects), you need to set up the policies through the Supabase Dashboard UI.

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
- Open your Supabase project dashboard
- Navigate to **Storage** in the left sidebar

### 2. Find Your Bucket
- Click on the `project-files` bucket

### 3. Configure Bucket Policies
- Click on **Policies** tab for the bucket
- You'll see "RLS enabled" but no policies (this is why uploads fail)

### 4. Create New Policies

Click **New Policy** and create these four policies:

#### Policy 1: INSERT (Upload)
- **Name**: `Allow uploads`
- **Policy command**: `INSERT`
- **Target roles**: Leave empty (applies to all)
- **WITH CHECK expression**:
```sql
true
```
*For production, use: `auth.role() = 'authenticated'`*

#### Policy 2: SELECT (View/Download)
- **Name**: `Allow downloads`
- **Policy command**: `SELECT`
- **Target roles**: Leave empty (applies to all)
- **USING expression**:
```sql
true
```
*For production, use: `auth.role() = 'authenticated'`*

#### Policy 3: UPDATE
- **Name**: `Allow updates`
- **Policy command**: `UPDATE`
- **Target roles**: Leave empty (applies to all)
- **USING expression**:
```sql
true
```
- **WITH CHECK expression**:
```sql
true
```
*For production, use: `auth.role() = 'authenticated'` for both*

#### Policy 4: DELETE
- **Name**: `Allow deletes`
- **Policy command**: `DELETE`
- **Target roles**: Leave empty (applies to all)
- **USING expression**:
```sql
true
```
*For production, use: `auth.role() = 'authenticated'`*

### 5. Save Each Policy
- Click **Save** after creating each policy
- You should have 4 policies total

## Alternative: Quick Template
Some Supabase versions offer policy templates. Look for:
- **"Allow all operations"** template (for testing)
- **"Authenticated can upload"** template (for production)

## Testing
After setting up the policies:
1. Go back to your app
2. Try uploading a file
3. It should work now!

## Production Security
For production, update all policies to require authentication:
- Change all `true` expressions to `auth.role() = 'authenticated'`
- This ensures only logged-in users can upload/view files

## Troubleshooting

### Still getting errors?
1. Check that the bucket name is exactly `project-files`
2. Ensure all 4 policies are created (INSERT, SELECT, UPDATE, DELETE)
3. Try refreshing your app and clearing browser cache
4. Check browser console for detailed error messages

### Need more restrictive policies?
You can use more complex expressions like:
```sql
-- Only allow uploads to user's own folder
(storage.foldername(name))[1] = auth.uid()::text

-- Only allow specific file types
storage.extension(name) = ANY(ARRAY['jpg', 'png', 'pdf'])

-- Limit file size (in bytes)
octet_length(name) < 10485760  -- 10MB
```