import { NextResponse } from 'next/server';
import { sendProjectInvitationEmail } from '@/lib/email';
import {
  handleSupabaseError,
  requireAdminServiceRole,
} from '@/app/api/_utils/admin';

const ALOA_PROJECT_WORKFLOW = [
  { name: 'Contract & Project Setup', type: 'milestone', sequence_order: 1, unlock_condition: { type: 'manual' } },
  { name: 'Design Inspiration Survey', type: 'form', sequence_order: 2, form_type: 'design_inspiration', unlock_condition: { type: 'previous_complete' } },
  { name: 'Mood Board Selection', type: 'form', sequence_order: 3, form_type: 'mood_board_selection', unlock_condition: { type: 'previous_complete' } },
  { name: 'Font Selection', type: 'form', sequence_order: 4, form_type: 'font_selection', unlock_condition: { type: 'previous_complete' } },
  { name: 'Color Palette Selection', type: 'form', sequence_order: 5, form_type: 'color_palette', unlock_condition: { type: 'previous_complete' } },
  { name: 'Homepage Content Brief', type: 'form', sequence_order: 6, form_type: 'homepage_content', unlock_condition: { type: 'previous_complete' } },
  { name: 'Homepage Copy Creation', type: 'content', sequence_order: 7, unlock_condition: { type: 'previous_complete' } },
  { name: 'Homepage Design', type: 'design', sequence_order: 8, unlock_condition: { type: 'previous_complete' } },
  { name: 'Site Structure Builder', type: 'form', sequence_order: 9, form_type: 'sitemap_builder', unlock_condition: { type: 'previous_complete' } },
  { name: 'Design Review & Approval', type: 'review', sequence_order: 100, unlock_condition: { type: 'all_pages_complete' } },
  { name: 'Development Phase', type: 'milestone', sequence_order: 101, unlock_condition: { type: 'design_approved' } },
  { name: 'Final Review & Launch', type: 'review', sequence_order: 102, unlock_condition: { type: 'development_complete' } },
];

export async function POST(request) {
  const adminContext = await requireAdminServiceRole();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { serviceSupabase } = adminContext;

  try {
    const {
      projectName,
      clientName,
      clientEmail,
      contractSignedDate,
      startDate,
      estimatedCompletionDate,
      introductionVideoUrl,
      mainPages = 5,
      auxPages = 5,
    } = await request.json();

    if (!projectName || !clientName || !clientEmail) {
      return NextResponse.json({ error: 'Project name, client name, and client email are required' }, { status: 400 });
    }

    const { data: project, error: projectError } = await serviceSupabase
      .from('aloa_projects')
      .insert([
        {
          project_name: projectName,
          client_name: clientName,
          client_email: clientEmail,
          contract_signed_date: contractSignedDate,
          start_date: startDate,
          estimated_completion_date: estimatedCompletionDate,
          introduction_video_url: introductionVideoUrl,
          status: 'initiated',
          rules: {
            main_pages: mainPages,
            aux_pages: auxPages,
          },
        },
      ])
      .select()
      .maybeSingle();

    if (projectError) {
      return handleSupabaseError(projectError, 'Failed to create project');
    }

    const projectlets = ALOA_PROJECT_WORKFLOW.map((item, index) => ({
      project_id: project.id,
      name: item.name,
      type: item.type,
      sequence_order: item.sequence_order,
      status: index === 0 ? 'available' : 'locked',
      unlock_condition: item.unlock_condition,
      metadata: item.form_type ? { form_type: item.form_type } : {},
    }));

    const { error: projectletsError } = await serviceSupabase
      .from('aloa_projectlets')
      .insert(projectlets);

    if (projectletsError && projectletsError.code !== 'PGRST116') {
      return handleSupabaseError(projectletsError, 'Failed to seed projectlets');
    }

    const { error: teamError } = await serviceSupabase
      .from('aloa_project_team')
      .insert([
        {
          project_id: project.id,
          email: clientEmail,
          name: clientName,
          role: 'client_admin',
          permissions: {
            can_fill_forms: true,
            can_approve: true,
            can_edit_project: false,
          },
        },
      ]);

    if (teamError && teamError.code !== 'PGRST116') {
      return handleSupabaseError(teamError, 'Failed to add client to project team');
    }

    const adminMembers = [
      { email: 'ross@aloa.co', name: 'Ross', role: 'admin' },
      { email: 'eli@aloa.co', name: 'Eli', role: 'designer' },
      { email: 'eduardo@aloa.co', name: 'Eduardo', role: 'developer' },
    ];

    for (const adminMember of adminMembers) {
      const { error: adminError } = await serviceSupabase
        .from('aloa_project_team')
        .insert([
          {
            project_id: project.id,
            email: adminMember.email,
            name: adminMember.name,
            role: adminMember.role,
            permissions: {
              can_fill_forms: true,
              can_approve: true,
              can_edit_project: true,
            },
          },
        ]);

      if (adminError && adminError.code !== 'PGRST116') {
        return handleSupabaseError(adminError, 'Failed to seed internal project team');
      }
    }

    const { error: timelineError } = await serviceSupabase
      .from('aloa_project_timeline')
      .insert([
        {
          project_id: project.id,
          event_type: 'project_started',
          description: `Project "${projectName}" initiated for ${clientName}`,
          metadata: {
            client_email: clientEmail,
            estimated_completion: estimatedCompletionDate,
          },
        },
      ]);

    if (timelineError) {
      return handleSupabaseError(timelineError, 'Failed to record project start');
    }

    const { error: memberError } = await serviceSupabase
      .from('aloa_project_members')
      .insert([
        {
          project_id: project.id,
          user_email: clientEmail,
          project_role: 'viewer',
          added_by: 'system',
          added_at: new Date().toISOString(),
        },
      ]);

    if (memberError && memberError.code !== 'PGRST116') {
      return handleSupabaseError(memberError, 'Failed to add client to project members');
    }

    let emailResult = { success: false, skipped: false };
    try {
      emailResult = await sendProjectInvitationEmail({
        projectName,
        clientName,
        clientEmail,
        projectId: project.id,
      });
    } catch (error) {
      emailResult = { success: false, skipped: false };
    }

    return NextResponse.json({
      success: true,
      project,
      message: 'Project initialized successfully',
      emailSent: emailResult.success && !emailResult.skipped,
      emailSkipped: emailResult.skipped,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
