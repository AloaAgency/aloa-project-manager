import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase service client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY // Using service key to bypass RLS
);

// POST - Create new project file record or upload file
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type');

    // Handle file upload with FormData
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const projectId = formData.get('projectId');
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
        console.error('Error uploading file to storage:', uploadError);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
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
          is_latest: true
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Error creating file record:', dbError);
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
      console.error('Error creating project file record:', error);
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
    console.error('Error in project files route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get project files
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const category = searchParams.get('category');

    let query = supabase
      .from('aloa_project_files')
      .select('*')
      .eq('is_visible', true)
      .order('uploaded_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('Error fetching project files:', error);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('Error in project files route:', error);
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
          console.error('Storage deletion error:', storageError);
          // Continue anyway - maybe file is already gone
        }
      } catch (err) {
        console.error('Storage deletion failed:', err);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('aloa_project_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      console.error('Error deleting project file:', error);
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
    console.error('Error in project files route:', error);
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
      console.error('Error updating project file:', error);
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
    console.error('Error in project files route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}