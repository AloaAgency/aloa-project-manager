import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId') || searchParams.get('form_id');
    const userId = searchParams.get('userId') || searchParams.get('user_id');

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
    let query = supabase
      .from('aloa_form_responses')
      .select(`
        *,
        aloa_form_response_answers (
          id,
          field_name,
          field_value
        )
      `)
      .eq('aloa_form_id', formId);

    // Filter by user_id if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: responses, error } = await query.order('submitted_at', { ascending: false });

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
        response_data: dataObject,  // Match the expected format
        data: dataObject  // Keep for backward compatibility
      };
    });

    return NextResponse.json({ responses: formattedResponses });

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

    const userId = body.userId || body.user_id || null;
    const projectId = body.projectId || body.project_id || null;
    let response;
    let isUpdate = false;

    // Get stakeholder importance if userId and projectId are provided
    let stakeholderImportance = 5; // Default importance
    let stakeholderId = null;

    if (userId && projectId && userId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
      const { data: stakeholder } = await supabase
        .from('aloa_project_stakeholders')
        .select('id, importance_score')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .single();

      if (stakeholder) {
        stakeholderImportance = stakeholder.importance_score || 5;
        stakeholderId = stakeholder.id;

      }
    }

    // Check if user already has a response for this form
    if (userId) {
      const { data: existingResponse } = await supabase
        .from('aloa_form_responses')
        .select('id')
        .eq('aloa_form_id', body.formId)
        .eq('user_id', userId)
        .single();

      if (existingResponse) {
        isUpdate = true;
        // Update existing response
        const { data: updatedResponse, error: updateError } = await supabase
          .from('aloa_form_responses')
          .update({
            responses: body.data || {},
            submitted_at: new Date().toISOString(),
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
            stakeholder_importance: stakeholderImportance,
            stakeholder_id: stakeholderId
          })
          .eq('id', existingResponse.id)
          .select()
          .single();

        if (updateError) {

          throw updateError;
        }

        response = updatedResponse;

        // Delete old answers for this response
        await supabase
          .from('aloa_form_response_answers')
          .delete()
          .eq('response_id', response.id);
      }
    }

    // If no existing response, create a new one
    if (!response) {
      const { data: newResponse, error: responseError } = await supabase
        .from('aloa_form_responses')
        .insert([{
          aloa_form_id: body.formId,
          aloa_project_id: projectId || null,
          user_id: userId,
          responses: body.data || {},
          submitted_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          stakeholder_importance: stakeholderImportance,
          stakeholder_id: stakeholderId
        }])
        .select()
        .single();

      if (responseError) {

        throw responseError;
      }

      response = newResponse;
    }

    // Store/update answers in aloa_form_response_answers
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

        throw answersError;
      }
    }

    // Only update submission count for new responses, not edits
    if (!isUpdate) {
      const { error: updateError } = await supabase
        .from('aloa_forms')
        .update({ 
          submission_count: supabase.raw('submission_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', body.formId);

      if (updateError) {

      }
    }

    const projectIdForExtraction = response?.aloa_project_id || projectId;
    if (projectIdForExtraction) {
      try {
        const extractor = new KnowledgeExtractor(projectIdForExtraction);
        await extractor.extractFromFormResponse(response.id);
      } catch (extractError) {
        console.error('Error extracting knowledge from form response:', extractError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Form response submitted successfully',
      responseId: response.id
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
}
