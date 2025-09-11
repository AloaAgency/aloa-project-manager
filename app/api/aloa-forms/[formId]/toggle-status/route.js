import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { formId } = params;
    const body = await request.json();
    
    // Update the form status
    const { data, error } = await supabase
      .from('aloa_forms')
      .update({
        is_active: body.is_active,
        closed_message: body.closed_message,
        updated_at: new Date().toISOString()
      })
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
      form: data
    });
    
  } catch (error) {
    console.error('Error in PATCH /api/aloa-forms/[formId]/toggle-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}