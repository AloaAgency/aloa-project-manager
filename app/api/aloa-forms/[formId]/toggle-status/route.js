import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { formId } = params;
    const body = await request.json();

    // Update the form status - using 'status' field which exists in the database
    const newStatus = body.is_active === false ? 'closed' : 'active';
    const { data, error } = await supabase
      .from('aloa_forms')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single();

    if (error) {

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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}