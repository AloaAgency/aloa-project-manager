import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { formId } = params;

    // First, check if it's a legacy form
    const { data: legacyForm } = await supabase
      .from('forms')
      .select('_id')
      .eq('_id', formId)
      .single();

    if (legacyForm) {
      // Delete legacy form and its responses
      const { error: responseError } = await supabase
        .from('responses')
        .delete()
        .eq('formId', formId);

      if (responseError) {
        console.error('Error deleting responses:', responseError);
      }

      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('_id', formId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Legacy form deleted successfully' });
    }

    // Check if it's an aloa form
    const { data: aloaForm } = await supabase
      .from('aloa_forms')
      .select('id')
      .eq('id', formId)
      .single();

    if (aloaForm) {
      // Delete aloa form responses
      const { error: responseError } = await supabase
        .from('aloa_form_responses')
        .delete()
        .eq('aloa_form_id', formId);

      if (responseError) {
        console.error('Error deleting responses:', responseError);
      }

      // Delete aloa form fields
      const { error: fieldsError } = await supabase
        .from('aloa_form_fields')
        .delete()
        .eq('aloa_form_id', formId);

      if (fieldsError) {
        console.error('Error deleting fields:', fieldsError);
      }

      // Delete the form itself
      const { error } = await supabase
        .from('aloa_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Form deleted successfully' });
    }

    return NextResponse.json(
      { error: 'Form not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}