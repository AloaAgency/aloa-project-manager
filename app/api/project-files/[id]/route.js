import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase service client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY // Using service key to bypass RLS
);

// DELETE - Delete project file by ID
export async function DELETE(request, { params }) {
  try {
    const fileId = params.id;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Get file details first
    const { data: fileData } = await supabase
      .from('aloa_project_files')
      .select('*')
      .eq('id', fileId)
      .single();

    // Delete from storage if path exists
    if (fileData?.storage_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from('project-files')
          .remove([fileData.storage_path]);

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

// GET - Get single project file by ID
export async function GET(request, { params }) {
  try {
    const fileId = params.id;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const { data: file, error } = await supabase
      .from('aloa_project_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      console.error('Error fetching project file:', error);
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error('Error in project files route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}