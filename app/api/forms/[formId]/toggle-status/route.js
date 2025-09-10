import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 503 }
      );
    }
    
    const { formId } = params;
    const { is_active, closed_message } = await request.json();

    // Update form status
    const updateData = {
      is_active: is_active,
      updated_at: new Date().toISOString()
    };

    // Optionally update the closed message
    if (closed_message !== undefined) {
      updateData.closed_message = closed_message;
    }

    const { data, error } = await supabase
      .from('forms')
      .update(updateData)
      .eq('id', formId)
      .select()
      .single();

    if (error) {
      console.error('Error updating form status:', error);
      return NextResponse.json(
        { error: 'Failed to update form status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      form: data,
      message: is_active ? 'Form reopened successfully' : 'Form closed successfully'
    });
  } catch (error) {
    console.error('Error toggling form status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle form status' },
      { status: 500 }
    );
  }
}