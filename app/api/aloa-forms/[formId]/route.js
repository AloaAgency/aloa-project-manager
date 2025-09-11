import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request, { params }) {
  try {
    const { formId } = params;

    // First check if the form exists
    const { data: form, error: fetchError } = await supabase
      .from('aloa_forms')
      .select('id, title')
      .eq('id', formId)
      .single();

    if (fetchError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Delete the form (this will cascade delete related fields and responses)
    const { error: deleteError } = await supabase
      .from('aloa_forms')
      .delete()
      .eq('id', formId);

    if (deleteError) {
      console.error('Error deleting form:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete form' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Form "${form.title}" deleted successfully`
    });

  } catch (error) {
    console.error('Error in DELETE /api/aloa-forms/[formId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { formId } = params;

    // Get form with all related data
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
          field_order,
          help_text,
          default_value
        ),
        aloa_form_responses (
          id,
          submitted_at
        )
      `)
      .eq('id', formId)
      .single();

    if (error || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Sort fields by order
    if (form.aloa_form_fields) {
      form.aloa_form_fields.sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
    }

    // Add response count
    form.response_count = form.aloa_form_responses?.length || 0;
    delete form.aloa_form_responses; // Remove raw responses from output

    return NextResponse.json(form);

  } catch (error) {
    console.error('Error in GET /api/aloa-forms/[formId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { formId } = params;
    const updates = await request.json();

    // Update the form
    const { data: form, error } = await supabase
      .from('aloa_forms')
      .update(updates)
      .eq('id', formId)
      .select()
      .single();

    if (error) {
      console.error('Error updating form:', error);
      return NextResponse.json(
        { error: 'Failed to update form' },
        { status: 500 }
      );
    }

    return NextResponse.json(form);

  } catch (error) {
    console.error('Error in PUT /api/aloa-forms/[formId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}