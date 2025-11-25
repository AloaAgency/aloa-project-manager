import { NextResponse } from 'next/server';
import { KnowledgeExtractor } from '@/lib/knowledgeExtractor';
import { createServiceClient } from '@/lib/supabase-service';
import {
  handleSupabaseError,
  hasProjectAccess,
  requireAuthenticatedSupabase,
} from '@/app/api/_utils/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = ['super_admin', 'project_admin'];

export async function GET(request) {
  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { user, isAdmin, role } = authContext;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const serviceSupabase = createServiceClient();
  const canImpersonate = isAdmin || role === 'client_admin';

  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId') || searchParams.get('form_id');
    const requestedUserId = searchParams.get('userId') || searchParams.get('user_id');
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');
    const projectIdValid = projectId && UUID_REGEX.test(projectId);

    if (!formId || !UUID_REGEX.test(formId)) {
      return NextResponse.json({ error: 'Invalid form ID format' }, { status: 400 });
    }

    let resolvedUserId = null;

    if (requestedUserId) {
      if (!UUID_REGEX.test(requestedUserId)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }

      if (requestedUserId === user.id) {
        resolvedUserId = user.id;
      } else {
        if (!canImpersonate) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!projectIdValid) {
          return NextResponse.json({ error: 'Project ID required to view another user\'s response' }, { status: 400 });
        }

        const callerHasAccess = await hasProjectAccess(serviceSupabase, projectId, user.id);
        if (!callerHasAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const targetHasAccess = await hasProjectAccess(serviceSupabase, projectId, requestedUserId);
        if (!targetHasAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        resolvedUserId = requestedUserId;
      }
    } else if (!isAdmin) {
      resolvedUserId = user.id;
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

    if (resolvedUserId) {
      query = query.eq('user_id', resolvedUserId);
    }

    if (projectIdValid) {
      query = query.eq('aloa_project_id', projectId);
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
  const serviceSupabase = createServiceClient();

  try {
    const body = await request.json();

    if (!body.formId || !UUID_REGEX.test(body.formId)) {
      return NextResponse.json({ error: 'Invalid form ID format' }, { status: 400 });
    }

    // Check if the form is public
    const { data: formRecord, error: formError } = await serviceSupabase
      .from('aloa_forms')
      .select('id, is_public, status, aloa_project_id')
      .eq('id', body.formId)
      .single();

    if (formError || !formRecord) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const isPublicForm = formRecord.is_public === true && formRecord.status === 'active';

    // Try to get authenticated user (may be null for public form submissions)
    let user = null;
    let profile = null;
    let isAdmin = false;
    let supabase = serviceSupabase;

    const authContext = await requireAuthenticatedSupabase();
    if (!authContext.error) {
      user = authContext.user;
      profile = authContext.profile;
      supabase = authContext.supabase;
      isAdmin = ADMIN_ROLES.includes(profile?.role);
    } else if (!isPublicForm) {
      // Form is not public and user is not authenticated
      return authContext.error;
    }

    const requestUserId = body.userId || body.user_id;
    let resolvedUserId = user?.id || null;

    if (requestUserId) {
      if (!UUID_REGEX.test(requestUserId)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }

      // Only admins can submit on behalf of other users
      if (isAdmin) {
        resolvedUserId = requestUserId;
      } else if (user && requestUserId !== user.id) {
        return NextResponse.json({ error: 'Cannot submit responses for another user' }, { status: 403 });
      }
    }

    // For public forms without a user, use null user_id
    // For authenticated submissions, use the resolved user ID
    const projectId = body.projectId || body.project_id || formRecord.aloa_project_id || null;

    // Verify CSRF token for browser-based submissions (skip for public forms without auth)
    const csrfToken = request.headers.get('X-CSRF-Token');
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const isUpdateAttempt = Boolean(body.responseId || body.response_id);

    // Only require CSRF for authenticated submissions that aren't updates
    if (!isPublicForm && !isUpdateAttempt && (!csrfToken || !cookieToken || csrfToken !== cookieToken)) {
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
    let existingResponse = null;

    // Only check for existing response if we have a user ID (skip for anonymous submissions)
    if (resolvedUserId) {
      const { data: existing, error: existingResponseError } = await serviceSupabase
        .from('aloa_form_responses')
        .select('id')
        .eq('aloa_form_id', body.formId)
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (existingResponseError && existingResponseError.code !== 'PGRST116') {
        return handleSupabaseError(existingResponseError, 'Failed to verify existing response');
      }
      existingResponse = existing;
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
      const { data: updatedResponse, error: updateError } = await serviceSupabase
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
      const { data: newResponse, error: responseError } = await serviceSupabase
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

    // Update submission count for new submissions (not updates)
    if (!isUpdate) {
      const { data: currentFormRecord, error: formFetchError } = await serviceSupabase
        .from('aloa_forms')
        .select('submission_count')
        .eq('id', body.formId)
        .maybeSingle();

      if (!formFetchError && currentFormRecord) {
        const submissionCount = Number(currentFormRecord.submission_count) || 0;
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
