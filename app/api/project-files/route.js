import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Create new project file record
export async function POST(request) {
  try {
    const body = await request.json();

    const { data: file, error } = await supabase
      .from('project_files')
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
        uploaded_by: body.uploaded_by || 'admin',
        description: body.description,
        tags: body.tags || [],
        metadata: body.metadata || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project file record:', error);
      return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
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
      .from('project_files')
      .select('*')
      .eq('is_latest', true)
      .order('uploaded_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (category) {
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

    // Delete from storage if path provided
    if (storagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([storagePath]);
        
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
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      console.error('Error deleting project file:', error);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in project files route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update file access count
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, increment_download } = body;

    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    let updateData = {
      last_accessed: new Date().toISOString()
    };

    if (increment_download) {
      // Increment download count
      const { data: currentFile } = await supabase
        .from('project_files')
        .select('download_count')
        .eq('id', id)
        .single();

      updateData.download_count = (currentFile?.download_count || 0) + 1;
    }

    const { data: file, error } = await supabase
      .from('project_files')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project file:', error);
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error('Error in project files route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}