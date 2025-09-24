import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { formIds, projectId } = body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid form IDs' },
        { status: 400 }
      );
    }

    // Update all forms with the new project ID
    const { data, error } = await supabase
      .from('aloa_forms')
      .update({
        aloa_project_id: projectId || null,
        updated_at: new Date().toISOString()
      })
      .in('id', formIds);

    if (error) {

      return NextResponse.json(
        { error: 'Failed to assign forms to project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${formIds.length} form(s) to project`,
      updatedCount: formIds.length
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}