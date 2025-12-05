import { NextResponse } from 'next/server';
import {
  handleSupabaseError,
  requireAuthenticatedSupabase,
  validateUuid
} from '@/app/api/_utils/admin';

export async function GET(request, { params }) {
  const { projectId } = params;
  const validationError = validateUuid(projectId, 'projectId');
  if (validationError) {
    return validationError;
  }

  const authContext = await requireAuthenticatedSupabase();
  if (authContext.error) {
    return authContext.error;
  }

  const { supabase } = authContext;

  try {
    const { data, error } = await supabase
      .from('aloa_communication_templates')
      .select(`
        *,
        assignments:aloa_communication_template_assignments(template_id, project_id)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return handleSupabaseError(error, 'Failed to load templates');
    }

    const templates = (data || []).filter((tmpl) => {
      if (tmpl.scope === 'global') return true;
      // restricted: only when assignment for this project exists
      const assigned = Array.isArray(tmpl.assignments)
        ? tmpl.assignments.some((row) => row.project_id === projectId)
        : false;
      return assigned;
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}
