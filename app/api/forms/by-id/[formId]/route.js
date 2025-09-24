import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    // Fetch form with its fields
    const { data: form, error } = await supabase
      .from('aloa_forms')
      .select(`
        *,
        aloa_form_fields (
          id,
          field_label,
          field_name,
          field_type,
          required,
          placeholder,
          options,
          validation,
          field_order
        )
      `)
      .eq('id', params.formId)
      .single();

    if (error || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Sort fields by position and format response
    const sortedFields = form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];

    // Format response for compatibility
    const response = NextResponse.json({
      ...form,
      _id: form.id,
      urlId: form.url_id,
      fields: sortedFields.map(field => ({
        ...field,
        _id: field.id,
        label: field.field_label, // Map field_label back to label for frontend
        name: field.field_name, // Map field_name back to name for frontend
        type: field.field_type, // Map field_type back to type for frontend
        position: field.field_order // Map field_order back to position for frontend
      })),
      createdAt: form.created_at,
      updatedAt: form.updated_at
    });

    // Add caching headers - form definitions rarely change, cache for 2 minutes
    response.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // First delete all response answers for this form
    const { data: responses } = await supabase
      .from('aloa_form_responses')
      .select('id')
      .eq('form_id', params.formId);

    if (responses && responses.length > 0) {
      const responseIds = responses.map(r => r.id);
      await supabase
        .from('aloa_form_response_answers')
        .delete()
        .in('response_id', responseIds);
    }

    // Delete all responses for this form
    await supabase
      .from('aloa_form_responses')
      .delete()
      .eq('form_id', params.formId);

    // Delete all fields for this form
    await supabase
      .from('aloa_form_fields')
      .delete()
      .eq('form_id', params.formId);

    // Finally delete the form itself
    const { error } = await supabase
      .from('aloa_forms')
      .delete()
      .eq('id', params.formId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    );
  }
}