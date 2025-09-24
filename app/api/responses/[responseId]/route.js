import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { responseId } = params;

    // Delete the response
    const { error } = await supabase
      .from('aloa_form_responses')
      .delete()
      .eq('id', responseId);

    if (error) {

      return NextResponse.json(
        { error: 'Failed to delete response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to delete response' },
      { status: 500 }
    );
  }
}