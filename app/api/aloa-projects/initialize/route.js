import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendProjectInvitationEmail } from '@/lib/email';

// Define the standard Aloa project workflow
const ALOA_PROJECT_WORKFLOW = [
  {
    name: 'Contract & Project Setup',
    type: 'milestone',
    sequence_order: 1,
    unlock_condition: { type: 'manual' }
  },
  {
    name: 'Design Inspiration Survey',
    type: 'form',
    sequence_order: 2,
    form_type: 'design_inspiration',
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Mood Board Selection',
    type: 'form',
    sequence_order: 3,
    form_type: 'mood_board_selection',
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Font Selection',
    type: 'form',
    sequence_order: 4,
    form_type: 'font_selection',
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Color Palette Selection',
    type: 'form',
    sequence_order: 5,
    form_type: 'color_palette',
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Homepage Content Brief',
    type: 'form',
    sequence_order: 6,
    form_type: 'homepage_content',
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Homepage Copy Creation',
    type: 'content',
    sequence_order: 7,
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Homepage Design',
    type: 'design',
    sequence_order: 8,
    unlock_condition: { type: 'previous_complete' }
  },
  {
    name: 'Site Structure Builder',
    type: 'form',
    sequence_order: 9,
    form_type: 'sitemap_builder',
    unlock_condition: { type: 'previous_complete' }
  },
  // Placeholder for dynamic page projectlets (will be added after sitemap is created)
  {
    name: 'Design Review & Approval',
    type: 'review',
    sequence_order: 100, // High number to ensure it comes after all page designs
    unlock_condition: { type: 'all_pages_complete' }
  },
  {
    name: 'Development Phase',
    type: 'milestone',
    sequence_order: 101,
    unlock_condition: { type: 'design_approved' }
  },
  {
    name: 'Final Review & Launch',
    type: 'review',
    sequence_order: 102,
    unlock_condition: { type: 'development_complete' }
  }
];

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      projectName,
      clientName,
      clientEmail,
      contractSignedDate,
      startDate,
      estimatedCompletionDate,
      introductionVideoUrl,
      mainPages = 5,
      auxPages = 5
    } = data;

    // Validate required fields
    if (!projectName || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: 'Project name, client name, and client email are required' },
        { status: 400 }
      );
    }

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .insert([{
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
          aux_pages: auxPages
        }
      }])
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    // Create projectlets based on the workflow
    const projectlets = ALOA_PROJECT_WORKFLOW.map((item, index) => ({
      project_id: project.id,
      name: item.name,
      type: item.type,
      sequence_order: item.sequence_order,
      status: index === 0 ? 'available' : 'locked', // First projectlet is available
      unlock_condition: item.unlock_condition,
      metadata: item.form_type ? { form_type: item.form_type } : {}
    }));

    const { error: projectletsError } = await supabase
      .from('aloa_projectlets')
      .insert(projectlets);

    if (projectletsError) {
      console.error('Error creating projectlets:', projectletsError);
      // Don't fail the whole operation, projectlets can be added later
    }

    // Add the client as a team member with client_admin role
    const { error: teamError } = await supabase
      .from('aloa_project_team')
      .insert([{
        project_id: project.id,
        email: clientEmail,
        name: clientName,
        role: 'client_admin', // Changed from 'client' to 'client_admin'
        permissions: {
          can_fill_forms: true,
          can_approve: true,
          can_edit_project: false
        }
      }]);

    if (teamError) {
      console.error('Error adding team member:', teamError);
    }

    // Add admins as team members (you can customize these emails)
    const adminEmails = [
      { email: 'ross@aloa.co', name: 'Ross', role: 'admin' },
      { email: 'eli@aloa.co', name: 'Eli', role: 'designer' },
      { email: 'eduardo@aloa.co', name: 'Eduardo', role: 'developer' }
    ];

    for (const admin of adminEmails) {
      await supabase
        .from('aloa_project_team')
        .insert([{
          project_id: project.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: {
            can_fill_forms: true,
            can_approve: true,
            can_edit_project: true
          }
        }]);
    }

    // Create timeline event for project start
    await supabase
      .from('aloa_project_timeline')
      .insert([{
        project_id: project.id,
        event_type: 'project_started',
        description: `Project "${projectName}" initiated for ${clientName}`,
        metadata: {
          client_email: clientEmail,
          estimated_completion: estimatedCompletionDate
        }
      }]);

    // Also add client to aloa_project_members table for proper access
    const { error: memberError } = await supabase
      .from('aloa_project_members')
      .insert([{
        project_id: project.id,
        user_email: clientEmail,
        project_role: 'viewer',
        added_by: 'system',
        added_at: new Date().toISOString()
      }]);

    if (memberError) {
      console.error('Error adding client to project members:', memberError);
    }

    // Send invitation email to client
    let emailResult = { success: false, skipped: false };
    try {
      emailResult = await sendProjectInvitationEmail({
        projectName,
        clientName,
        clientEmail,
        projectId: project.id
      });

      if (emailResult.success && !emailResult.skipped) {
        console.log(`Project invitation email sent to ${clientEmail}`);
      } else if (emailResult.skipped) {
        console.log('Email skipped - no RESEND_API_KEY configured');
      } else {
        console.error('Failed to send project invitation email:', emailResult.error);
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
    }

    return NextResponse.json({
      success: true,
      project: project,
      message: 'Project initialized successfully',
      emailSent: emailResult.success && !emailResult.skipped,
      emailSkipped: emailResult.skipped
    });

  } catch (error) {
    console.error('Error initializing project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}