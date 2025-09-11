# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage for the file upload functionality in the Aloa Project Manager.

## Overview

The application uses a hybrid approach for file storage:
- **Small files (< 5MB)**: Stored as base64 in the database for simplicity
- **Large files (> 5MB)**: Stored in Supabase Storage for performance
- **Maximum file size**: 200MB (configurable)

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Create a bucket with these settings:
   - **Name**: `project-files`
   - **Public**: NO (keep it private for security)
   - **File size limit**: 200MB (or your preferred max)
   - **Allowed MIME types**: Leave empty to allow all

## Step 2: Set Up Database Table

Run the SQL migration in `supabase/create_project_files_table.sql`:

```sql
-- This creates the project_files table with proper indexes and RLS policies
-- Run this in your Supabase SQL Editor
```

## Step 3: Configure Row Level Security (RLS)

For the storage bucket, set up these RLS policies in the Supabase Dashboard:

### Storage Policies

1. **Admin Upload Policy**:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
);
```

2. **Project-Based Access Policy**:
```sql
-- Allow users to access files for their projects
CREATE POLICY "Users can view their project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  auth.role() = 'authenticated'
);
```

3. **Admin Delete Policy**:
```sql
-- Allow admins to delete files
CREATE POLICY "Admins can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
);
```

## Step 4: Folder Structure

The application organizes files in this structure:
```
project-files/
├── projects/
│   ├── {project_id}/
│   │   ├── final-deliverables/    # Client-facing final files
│   │   ├── work-in-progress/      # Internal WIP files
│   │   └── general/               # General project files
```

## Step 5: Environment Variables

Ensure your `.env.local` has the correct Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## File Categories

The system supports three file categories:

1. **Final Deliverables** (`final-deliverables`)
   - Style guides, brand assets, final designs
   - Prominently displayed to clients
   - Usually large files (PDFs, videos, design files)

2. **Work in Progress** (`work-in-progress`)
   - Draft designs, internal documents
   - Not prominently shown to clients
   - Can be converted to final deliverables

3. **General** (`general`)
   - Meeting notes, references, misc files
   - Standard visibility

## Usage in the Application

### Admin Side
- Upload files directly from the projectlet management view
- Choose file category (Final Deliverables gets special treatment)
- Set file size limits and allowed types
- Files > 5MB automatically use Supabase Storage

### Client Side
- "Final Deliverables" section appears prominently
- Download files with one click
- See file metadata (size, upload date)
- Track download history

## Security Considerations

1. **Never make the bucket fully public** - Use RLS policies
2. **Use signed URLs** for temporary access to private files
3. **Validate file types** on both client and server
4. **Set appropriate file size limits**
5. **Track downloads** for audit purposes

## Troubleshooting

### "Storage bucket not configured" error
- Ensure the bucket name is exactly `project-files`
- Check that the bucket exists in Supabase Dashboard

### "Row level security policy violation" error
- Verify RLS policies are properly set up
- Check that the user is authenticated
- Ensure the bucket is not set to public

### Large files fail to upload
- Check bucket size limit in Supabase Dashboard
- Verify network timeout settings
- Consider chunked uploads for very large files

## Future Enhancements

1. **Versioning**: Track file versions automatically
2. **Compression**: Auto-compress images before upload
3. **Previews**: Generate thumbnails for images/videos
4. **Batch Upload**: Upload multiple files at once
5. **Folder Download**: Download entire folders as ZIP
6. **CDN Integration**: Use Supabase CDN for faster downloads