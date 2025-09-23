import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';

// Initialize Supabase service client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY // Using service key to bypass RLS
);

// POST - Create new project file record, upload file, or create folder
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type');

    // Handle folder creation with JSON
    if (contentType?.includes('application/json')) {
      const { project_id, file_name, is_folder, parent_folder_id, uploaded_by } = await request.json();

      if (!project_id || !file_name) {
        return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 });
      }

      if (is_folder) {
        // Create folder record
        const { data: folderRecord, error: folderError } = await supabase
          .from('aloa_project_files')
          .insert([{
            project_id,
            file_name,
            is_folder: true,
            parent_folder_id: parent_folder_id || null,
            uploaded_by: uploaded_by || 'admin',
            folder_path: '/',
            is_visible: true
          }])
          .select()
          .single();

        if (folderError) {

          return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
        }

        return NextResponse.json({ folder: folderRecord });
      }

      // Handle regular file creation (legacy JSON path)
      return NextResponse.json({ error: 'Use FormData for file uploads' }, { status: 400 });
    }

    // Handle file upload with FormData
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const projectId = formData.get('project_id') || formData.get('projectId');
      const parentFolderId = formData.get('parent_folder_id');
      const category = formData.get('category') || 'general';
      const description = formData.get('description') || '';
      const tags = formData.get('tags') ? JSON.parse(formData.get('tags')) : [];

      if (!file || !projectId) {
        return NextResponse.json({ error: 'File and projectId are required' }, { status: 400 });
      }

      // Get user from cookies
      const cookieStore = cookies();
      const userRole = cookieStore.get('userRole')?.value;
      const userId = cookieStore.get('userId')?.value;

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${projectId}/${timestamp}_${sanitizedName}`;

      // Upload file to Supabase Storage
      const fileBuffer = await file.arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 });
      }

      // Check if upload actually succeeded
      if (!uploadData || !uploadData.path) {
        return NextResponse.json({ error: 'Upload failed - no data returned' }, { status: 500 });
      }

      // Verify the file actually exists in storage
      const { data: existsData, error: existsError } = await supabase.storage
        .from('project-files')
        .list(projectId, {
          limit: 1,
          search: sanitizedName
        });

      if (existsError) {

      }

      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(storagePath);

      // Create database record
      const { data: fileRecord, error: dbError } = await supabase
        .from('aloa_project_files')
        .insert([{
          project_id: projectId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          category: category,
          is_public: false,
          requires_auth: true,
          uploaded_by: userRole || 'admin',
          uploaded_by_id: userId,
          description: description,
          tags: tags,
          metadata: {},
          url: publicUrl,
          download_count: 0,
          is_visible: true,
          is_latest: true,
          is_folder: false,
          parent_folder_id: parentFolderId || null
        }])
        .select()
        .single();

      if (dbError) {

        // Clean up uploaded file
        await supabase.storage.from('project-files').remove([storagePath]);
        return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
      }

      // Log activity to timeline
      await supabase
        .from('aloa_project_timeline')
        .insert({
          project_id: projectId,
          event_type: 'file_upload',
          description: `File "${file.name}" uploaded by ${userRole || 'user'}`,
          user_id: userId,
          metadata: {
            file_id: fileRecord.id,
            file_name: file.name,
            file_size: file.size,
            category: category
          }
        });

      // Trigger knowledge extraction for text files
      const textTypes = ['text/plain', 'text/markdown', 'text/html', 'application/json', 'text/csv'];
      const isTextFile = textTypes.includes(file.type) ||
                        file.name.endsWith('.md') ||
                        file.name.endsWith('.txt') ||
                        file.name.endsWith('.json') ||
                        file.name.endsWith('.csv');

      if (isTextFile) {
        try {
          // Add to extraction queue
          await supabase
            .from('aloa_knowledge_extraction_queue')
            .insert({
              project_id: projectId,
              source_type: 'file_document',
              source_id: fileRecord.id,
              metadata: {
                file_name: file.name,
                file_type: file.type,
                file_id: fileRecord.id
              },
              status: 'pending',
              created_at: new Date().toISOString()
            });

          // Try immediate extraction with debug logging

          const extractor = new KnowledgeExtractor(projectId);
          await extractor.extractFromFile(fileRecord.id);
        } catch (extractError) {

          // Don't fail the upload if extraction fails
        }
      }

      // Send notification to admins if uploaded by client
      if (userRole === 'client') {
        await supabase
          .from('aloa_applet_interactions')
          .insert({
            project_id: projectId,
            interaction_type: 'file_upload',
            user_identifier: userId || 'anonymous',
            data: {
              file_name: file.name,
              file_size: file.size,
              category: category,
              file_id: fileRecord.id
            },
            created_at: new Date().toISOString(),
            read: false
          });
      }

      return NextResponse.json({
        file: fileRecord,
        url: publicUrl,
        id: fileRecord.id
      });
    }

    // Handle JSON body (for backwards compatibility)
    const body = await request.json();

    // Get user from cookies
    const cookieStore = cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const userId = cookieStore.get('userId')?.value;

    const { data: file, error } = await supabase
      .from('aloa_project_files')
      .insert([{
        project_id: body.project_id,
        projectlet_id: body.projectlet_id,
        applet_id: body.applet_id,
        file_name: body.file_name,
        file_size: body.file_size,
        file_type: body.file_type,
        storage_path: body.storage_path,
        category: body.category || 'general',
        is_public: body.is_public || false,
        requires_auth: body.requires_auth !== false,
        uploaded_by: body.uploaded_by || userRole || 'admin',
        uploaded_by_id: userId,
        description: body.description,
        tags: body.tags || [],
        metadata: body.metadata || {},
        url: body.url,
        download_count: 0,
        is_visible: true,
        is_latest: true
      }])
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
    }

    // Log activity to timeline
    await supabase
      .from('aloa_project_timeline')
      .insert({
        project_id: body.project_id,
        event_type: 'file_upload',
        description: `File "${body.file_name}" uploaded by ${body.uploaded_by || userRole || 'user'}`,
        user_id: userId,
        metadata: {
          file_id: file.id,
          file_name: body.file_name,
          file_size: body.file_size,
          category: body.category
        }
      });

    // Send notification to admins if uploaded by client
    if (body.uploaded_by === 'client' || userRole === 'client') {
      await supabase
        .from('aloa_applet_interactions')
        .insert({
          project_id: body.project_id,
          interaction_type: 'file_upload',
          user_identifier: userId || 'anonymous',
          data: {
            file_name: body.file_name,
            file_size: body.file_size,
            category: body.category,
            file_id: file.id
          },
          created_at: new Date().toISOString(),
          read: false
        });
    }

    return NextResponse.json({ file });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get project files and folders
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const category = searchParams.get('category');
    const parentFolderId = searchParams.get('parent_folder_id');
    const appletId = searchParams.get('applet_id');

    let query = supabase
      .from('aloa_project_files')
      .select('*')
      .eq('is_visible', true)
      .order('uploaded_at', { ascending: false });

    if (appletId) {
      query = query.eq('applet_id', appletId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Filter by parent folder only if applet_id is not specified
    if (!appletId) {
      if (parentFolderId) {
        query = query.eq('parent_folder_id', parentFolderId);
      } else {
        // If no parent_folder_id provided, get root level items
        query = query.is('parent_folder_id', null);
      }
    }

    // Order folders first, then files
    const { data: files, error } = await query
      .order('is_folder', { ascending: false })
      .order('file_name', { ascending: true });

    if (error) {

      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    return NextResponse.json({ files: files || [] });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete project file
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    const storagePath = searchParams.get('storage_path');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Get file details first
    const { data: fileData } = await supabase
      .from('aloa_project_files')
      .select('*')
      .eq('id', fileId)
      .single();

    // Delete from storage if path provided
    const pathToDelete = storagePath || fileData?.storage_path;
    if (pathToDelete) {
      try {
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([pathToDelete]);

        if (storageError) {

          // Continue anyway - maybe file is already gone
        }
      } catch (err) {

      }
    }

    // Delete from database
    const { error } = await supabase
      .from('aloa_project_files')
      .delete()
      .eq('id', fileId);

    if (error) {

      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    // Log deletion activity
    if (fileData) {
      const cookieStore = cookies();
      const userId = cookieStore.get('userId')?.value;

      await supabase
        .from('aloa_project_timeline')
        .insert({
          project_id: fileData.project_id,
          event_type: 'file_delete',
          description: `File "${fileData.file_name}" deleted`,
          user_id: userId,
          metadata: {
            file_id: fileData.id,
            file_name: fileData.file_name
          }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update file access count or other properties
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    let updateData = {
      last_accessed: new Date().toISOString(),
      ...updates
    };

    // Handle download tracking
    if (action === 'download' || body.increment_download) {
      // Increment download count
      const { data: currentFile } = await supabase
        .from('aloa_project_files')
        .select('download_count')
        .eq('id', id)
        .single();

      updateData.download_count = (currentFile?.download_count || 0) + 1;
      updateData.last_downloaded_at = new Date().toISOString();
    }

    const { data: file, error } = await supabase
      .from('aloa_project_files')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {

      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }

    // Log download activity if applicable
    if (action === 'download' || body.increment_download) {
      const cookieStore = cookies();
      const userId = cookieStore.get('userId')?.value;

      await supabase
        .from('aloa_project_timeline')
        .insert({
          project_id: file.project_id,
          event_type: 'file_download',
          description: `File "${file.file_name}" downloaded`,
          user_id: userId,
          metadata: {
            file_id: file.id,
            file_name: file.file_name
          }
        });
    }

    return NextResponse.json({ file });
  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}