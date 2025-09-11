import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 503 }
      );
    }
    
    const { formIds, projectId } = await request.json();

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json(
        { error: 'Form IDs are required' },
        { status: 400 }
      );
    }

    // Update all specified forms with the new project_id
    // This does NOT change the url_id, so public URLs remain the same
    const { data, error } = await supabase
      .from('aloa_forms')
      .update({ 
        project_id: projectId || null,
        updated_at: new Date().toISOString()
      })
      .in('id', formIds);

    if (error) {
      console.error('Error updating forms:', error);
      return NextResponse.json(
        { error: 'Failed to update forms' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${formIds.length} form(s)` 
    });
  } catch (error) {
    console.error('Error in bulk assign:', error);
    return NextResponse.json(
      { error: 'Failed to bulk assign project' },
      { status: 500 }
    );
  }
}