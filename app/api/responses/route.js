import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendFormResponseEmail } from '@/lib/email';
import { sanitizeText, sanitizeEmail, sanitizeURL, sanitizeNumber, sanitizeArray } from '@/lib/security';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format to prevent SQL injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 }
      );
    }

    // Fetch responses with their answers joined with field names
    const { data: responses, error } = await supabase
      .from('aloa_form_responses')
      .select(`
        *,
        aloa_form_response_answers (
          id,
          value,
          aloa_form_fields (
            field_name,
            field_label
          )
        )
      `)
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Format responses for compatibility - create plain object for data
    const formattedResponses = responses.map(response => {
      const dataObject = {};
      response.aloa_form_response_answers?.forEach(answer => {
        if (answer.aloa_form_fields?.field_name) {
          // Parse JSON values for arrays/objects
          try {
            const parsedValue = JSON.parse(answer.value);
            dataObject[answer.aloa_form_fields.field_name] = parsedValue;
          } catch {
            // If not JSON, use as-is
            dataObject[answer.aloa_form_fields.field_name] = answer.value;
          }
        }
      });

      return {
        ...response,
        _id: response.id,
        formId: response.form_id,
        submittedAt: response.submitted_at,
        data: dataObject
      };
    });

    return NextResponse.json(formattedResponses);
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate form ID
    if (!body.formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format to prevent SQL injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 }
      );
    }

    // Verify CSRF token for state-changing operations
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieToken = request.cookies.get('csrf-token')?.value;

    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // First, create the response record
    const responseData = {
      form_id: body.formId
    };

    const { data: response, error: responseError } = await supabase
      .from('aloa_form_responses')
      .insert([responseData])
      .select()
      .single();

    if (responseError) throw responseError;

    // Get the form fields to map field names to IDs
    const { data: fields, error: fieldsError } = await supabase
      .from('aloa_form_fields')
      .select('id, field_name')
      .eq('form_id', body.formId);

    if (fieldsError) throw fieldsError;

    // Create a map of field names to IDs
    const fieldMap = new Map();
    fields.forEach(field => {
      fieldMap.set(field.field_name, field.id);
    });

    // Get field details for validation
    const { data: fieldDetails, error: fieldDetailsError } = await supabase
      .from('aloa_form_fields')
      .select('id, field_name, field_type, required, validation')
      .eq('form_id', body.formId);

    if (fieldDetailsError) throw fieldDetailsError;

    // Create field detail map
    const fieldDetailMap = new Map();
    fieldDetails.forEach(field => {
      fieldDetailMap.set(field.field_name, field);
    });

    // Convert and sanitize the form data
    const dataToStore = body.data instanceof Map 
      ? body.data
      : new Map(Object.entries(body.data || {}));

    const answers = [];
    const errors = [];

    dataToStore.forEach((value, fieldName) => {
      const fieldId = fieldMap.get(fieldName);
      const fieldDetail = fieldDetailMap.get(fieldName);

      if (fieldId && value !== undefined && value !== null && value !== '') {
        let sanitizedValue;

        try {
          // Sanitize based on field type
          switch (fieldDetail?.field_type) {
            case 'email':
              sanitizedValue = sanitizeEmail(value);
              break;
            case 'url':
              sanitizedValue = sanitizeURL(value);
              break;
            case 'number':
            case 'rating':
              const num = sanitizeNumber(value, 
                fieldDetail?.validation?.min || 0,
                fieldDetail?.validation?.max || Number.MAX_SAFE_INTEGER
              );
              sanitizedValue = String(num);
              break;
            case 'checkbox':
            case 'multiselect':
              const arrayValue = Array.isArray(value) ? value : [value];
              const sanitizedArray = sanitizeArray(arrayValue, fieldDetail?.validation?.options);
              sanitizedValue = JSON.stringify(sanitizedArray);
              break;
            case 'text':
            case 'textarea':
            case 'tel':
            case 'select':
            case 'radio':
            case 'date':
            default:
              sanitizedValue = sanitizeText(String(value));
              // Limit text length
              const maxLength = fieldDetail?.validation?.maxLength || 10000;
              if (sanitizedValue.length > maxLength) {
                sanitizedValue = sanitizedValue.substring(0, maxLength);
              }
              break;
          }

          answers.push({
            response_id: response.id,
            field_id: fieldId,
            value: sanitizedValue
          });
        } catch (error) {
          errors.push(`Invalid value for field ${fieldName}: ${error.message}`);
        }
      } else if (!fieldId) {

      } else if (fieldDetail?.required && !value) {
        errors.push(`Required field ${fieldName} is missing`);
      }
    });

    // Check for validation errors
    if (errors.length > 0) {
      // Rollback by deleting the response
      await supabase.from('aloa_form_responses').delete().eq('id', response.id);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Insert all answers
    if (answers.length > 0) {

      const { error: answersError } = await supabase
        .from('aloa_form_response_answers')
        .insert(answers);

      if (answersError) {

        // Rollback by deleting the response
        await supabase.from('aloa_form_responses').delete().eq('id', response.id);
        throw answersError;
      }

    } else {

    }

    // Fetch the form details for the email
    const { data: form, error: formError } = await supabase
      .from('aloa_forms')
      .select(`
        *,
        aloa_form_fields (
          id,
          field_name,
          field_label,
          field_type,
          field_order,
          validation
        )
      `)
      .eq('id', body.formId)
      .single();

    if (!formError && form) {
      // Send email notification
      try {
        const emailResult = await sendFormResponseEmail({
          form: {
            id: form.id,
            title: form.title,
            fields: form.aloa_form_fields.sort((a, b) => (a.field_order || 0) - (b.field_order || 0))
          },
          responses: body.data,
          recipientEmail: form.notification_email || 'ross@aloa.agency'
        });

        if (emailResult.success) {

        } else {

        }
      } catch (emailError) {

        // Don't fail the response submission if email fails
      }
    }

    return NextResponse.json({
      ...response,
      _id: response.id,
      formId: response.form_id,
      submittedAt: response.submitted_at
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
}