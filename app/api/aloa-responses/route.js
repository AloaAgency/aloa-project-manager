import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 }
      );
    }
    
    // Fetch responses from aloa_form_responses ONLY
    const { data: responses, error } = await supabase
      .from('aloa_form_responses')
      .select(`
        *,
        aloa_form_response_answers (
          id,
          field_name,
          field_value
        )
      `)
      .eq('aloa_form_id', formId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    
    // Format responses for frontend
    const formattedResponses = responses.map(response => {
      const dataObject = {};
      response.aloa_form_response_answers?.forEach(answer => {
        if (answer.field_name) {
          // Parse JSON values for arrays/objects
          try {
            const parsedValue = JSON.parse(answer.field_value);
            dataObject[answer.field_name] = parsedValue;
          } catch {
            // If not JSON, use as-is
            dataObject[answer.field_name] = answer.field_value;
          }
        }
      });
      
      return {
        id: response.id,
        submittedAt: response.submitted_at,
        data: dataObject
      };
    });
    
    return NextResponse.json(formattedResponses);
    
  } catch (error) {
    console.error('Error fetching aloa responses:', error);
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
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.formId)) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400 }
      );
    }
    
    // Verify CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieToken = request.cookies.get('csrf-token')?.value;
    
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // Create response in aloa_form_responses with project ID
    const { data: response, error: responseError } = await supabase
      .from('aloa_form_responses')
      .insert([{
        aloa_form_id: body.formId,
        aloa_project_id: body.projectId || null, // Include project ID if provided
        responses: body.data || {}, // Add the responses field
        submitted_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      }])
      .select()
      .single();
    
    if (responseError) {
      console.error('Error creating response:', responseError);
      throw responseError;
    }
    
    // Store answers in aloa_form_response_answers
    const answers = [];
    Object.entries(body.data || {}).forEach(([fieldName, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        answers.push({
          response_id: response.id,
          field_name: fieldName,
          field_value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        });
      }
    });
    
    if (answers.length > 0) {
      const { error: answersError } = await supabase
        .from('aloa_form_response_answers')
        .insert(answers);
      
      if (answersError) {
        console.error('Error storing answers:', answersError);
        throw answersError;
      }
    }
    
    // Update submission count on the form
    const { error: updateError } = await supabase
      .from('aloa_forms')
      .update({ 
        submission_count: supabase.raw('submission_count + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', body.formId);
    
    if (updateError) {
      console.error('Error updating submission count:', updateError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Form response submitted successfully',
      responseId: response.id
    });
    
  } catch (error) {
    console.error('Error submitting aloa response:', error);
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
}