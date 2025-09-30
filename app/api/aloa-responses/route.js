import { NextResponse } from 'next/server';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  requireAdminServiceRole,
  requireAuthenticatedSupabase,
} from '@/app/api/_utils/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = ['super_admin', 'project_admin'];

export async function GET(request) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId') || searchParams.get('form_id');
    const userFilter = searchParams.get('userId') || searchParams.get('user_id');

    if (!formId || !UUID_REGEX.test(formId)) {
      return NextResponse.json({ error: 'Invalid form ID format' }, { status: 400 });
    }

    let query = serviceSupabase
      .from('aloa_form_responses')
      .select(
        `
          *,
          aloa_form_response_answers (
            id,
            field_name,
            field_value
          )
        `
      )
      .eq('aloa_form_id', formId);

    if (userFilter) {
      if (!UUID_REGEX.test(userFilter)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }
      query = query.eq('user_id', userFilter);
    }

    const { data: responses, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error, 'Failed to fetch responses');
    }

    const formattedResponses = (responses || []).map((response) => {
      const dataObject = {};
      response.aloa_form_response_answers?.forEach((answer) => {
        if (!answer.field_name) {
          return;
        }

        try {
          const parsedValue = JSON.parse(answer.field_value);
          dataObject[answer.field_name] = parsedValue;
        } catch {
          dataObject[answer.field_name] = answer.field_value;
        }
      });

      return {
        id: response.id,
        submittedAt: response.submitted_at,
        response_data: dataObject,
        data: dataObject,
      };
    });

    return NextResponse.json({ responses: formattedResponses });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}

export async function POST(request) {
  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase, user, profile } = authContext;
  const role = profile?.role;
  const isAdmin = ADMIN_ROLES.includes(role);
  const serviceSupabase = createServiceClient();

  try {
    const body = await request.json();

    if (!body.formId || !UUID_REGEX.test(body.formId)) {
      return NextResponse.json({ error: 'Invalid form ID format' }, { status: 400 });
    }

    const requestUserId = body.userId || body.user_id;
    let resolvedUserId = user.id;

    if (requestUserId) {
      if (!UUID_REGEX.test(requestUserId)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }

      // Only admins can submit on behalf of other users
      if (isAdmin) {
        resolvedUserId = requestUserId;
      } else if (requestUserId !== user.id) {
        return NextResponse.json({ error: 'Cannot submit responses for another user' }, { status: 403 });
      }
    }

    const projectId = body.projectId || body.project_id || null;

    // Verify CSRF token for browser-based submissions
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const isUpdateAttempt = Boolean(body.responseId || body.response_id);

    if (!isUpdateAttempt && (!csrfToken || !cookieToken || csrfToken !== cookieToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    let stakeholderImportance = 5;
    let stakeholderId = null;

    if (resolvedUserId && projectId && UUID_REGEX.test(projectId)) {
      const { data: stakeholder, error: stakeholderError } = await supabase
        .from('aloa_project_stakeholders')
        .select('id, importance_score')
        .eq('user_id', resolvedUserId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (stakeholderError && stakeholderError.code !== 'PGRST116') {
        return handleSupabaseError(stakeholderError, 'Failed to verify stakeholder information');
      }

      if (stakeholder) {
        stakeholderImportance = stakeholder.importance_score || 5;
        stakeholderId = stakeholder.id;
      }
    }

    let responseRecord = null;
    let isUpdate = false;

    const { data: existingResponse, error: existingResponseError } = await supabase
      .from('aloa_form_responses')
      .select('id')
      .eq('aloa_form_id', body.formId)
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (existingResponseError && existingResponseError.code !== 'PGRST116') {
      return handleSupabaseError(existingResponseError, 'Failed to verify existing response');
    }

    const responsePayload = {
      aloa_form_id: body.formId,
      aloa_project_id: projectId,
      user_id: resolvedUserId,
      responses: body.data || {},
      submitted_at: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
      stakeholder_importance: stakeholderImportance,
      stakeholder_id: stakeholderId,
    };

    if (existingResponse) {
      isUpdate = true;
      const { data: updatedResponse, error: updateError } = await supabase
        .from('aloa_form_responses')
        .update(responsePayload)
        .eq('id', existingResponse.id)
        .select()
        .single();

      if (updateError) {
        return handleSupabaseError(updateError, 'Failed to update response');
      }

      responseRecord = updatedResponse;

      const { error: deleteAnswersError } = await serviceSupabase
        .from('aloa_form_response_answers')
        .delete()
        .eq('response_id', responseRecord.id);

      if (deleteAnswersError) {
        return handleSupabaseError(deleteAnswersError, 'Failed to replace existing answers');
      }
    } else {
      const { data: newResponse, error: responseError } = await supabase
        .from('aloa_form_responses')
        .insert([responsePayload])
        .select()
        .single();

      if (responseError) {
        return handleSupabaseError(responseError, 'Failed to submit response');
      }

      responseRecord = newResponse;
    }

    const answers = [];
    Object.entries(body.data || {}).forEach(([fieldName, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      answers.push({
        response_id: responseRecord.id,
        field_name: fieldName,
        field_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      });
    });

    if (answers.length > 0) {
      const { error: answersError } = await serviceSupabase
        .from('aloa_form_response_answers')
        .insert(answers);

      if (answersError) {
        return handleSupabaseError(answersError, 'Failed to store response answers');
      }
    }

    if (!isUpdate && isAdmin) {
      const { data: formRecord, error: formFetchError } = await serviceSupabase
        .from('aloa_forms')
        .select('submission_count')
        .eq('id', body.formId)
        .maybeSingle();

      if (!formFetchError && formRecord) {
        const submissionCount = Number(formRecord.submission_count) || 0;
        const { error: submissionUpdateError } = await serviceSupabase
          .from('aloa_forms')
          .update({
            submission_count: submissionCount + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.formId);

        if (submissionUpdateError) {
          console.error('Failed to increment submission count:', submissionUpdateError);
        }
      }
    }

    const projectIdForExtraction = responseRecord?.aloa_project_id || projectId;
    if (projectIdForExtraction) {
      try {
        const extractor = new KnowledgeExtractor(projectIdForExtraction);
        await extractor.extractFromFormResponse(responseRecord.id);
      } catch (extractError) {
        console.error('Error extracting knowledge from form response:', extractError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Form response submitted successfully',
      responseId: responseRecord.id,
    });
  } catch (error) {
    if (error?.code) {
      return handleSupabaseError(error, 'Failed to submit response');
    }

    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}
