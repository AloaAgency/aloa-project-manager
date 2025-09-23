import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createServiceClient } from '@/lib/supabase-service';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // Use service client to bypass RLS for reading team members
    const serviceClient = createServiceClient();

    // Get team members for this project with user profile information
    const { data: team, error } = await serviceClient
      .from('aloa_project_members')
      .select(`
        *,
        user:aloa_user_profiles!aloa_project_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('project_id', projectId)
      .neq('project_role', 'viewer'); // Exclude client stakeholders (viewers)

    if (error) {

      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    // Format the response to include user details
    const formattedTeam = (team || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      project_id: member.project_id,
      project_role: member.project_role,
      email: member.user?.email,
      name: member.user?.full_name,
      avatar_url: member.user?.avatar_url,
      system_role: member.user?.role
    }));

    return NextResponse.json({
      team: formattedTeam,
      count: formattedTeam.length
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { user_id, project_role } = body;

    if (!user_id || !project_role) {
      return NextResponse.json(
        { error: 'User ID and project role are required' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for modifications
    const serviceClient = createServiceClient();

    // Check if user is already a member of this project
    const { data: existingMember } = await serviceClient
      .from('aloa_project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user_id)
      .single();

    if (existingMember) {
      // Update existing member's role
      const { data: updatedMember, error: updateError } = await serviceClient
        .from('aloa_project_members')
        .update({ project_role })
        .eq('id', existingMember.id)
        .select(`
          *,
          user:aloa_user_profiles!aloa_project_members_user_id_fkey(
            id,
            email,
            full_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (updateError) {

        return NextResponse.json(
          { error: 'Failed to update team member' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        member: {
          id: updatedMember.id,
          user_id: updatedMember.user_id,
          project_id: updatedMember.project_id,
          project_role: updatedMember.project_role,
          email: updatedMember.user?.email,
          name: updatedMember.user?.full_name,
          avatar_url: updatedMember.user?.avatar_url,
          system_role: updatedMember.user?.role
        }
      });
    }

    // Add new team member using service client to bypass RLS
    const { data: newMember, error } = await serviceClient
      .from('aloa_project_members')
      .insert([{
        project_id: projectId,
        user_id,
        project_role
      }])
      .select(`
        *,
        user:aloa_user_profiles!aloa_project_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          role
        )
      `)
      .single();

    if (error) {

      return NextResponse.json(
        { error: error.message || 'Failed to add team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        user_id: newMember.user_id,
        project_id: newMember.project_id,
        project_role: newMember.project_role,
        email: newMember.user?.email,
        name: newMember.user?.full_name,
        avatar_url: newMember.user?.avatar_url,
        system_role: newMember.user?.role
      }
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID required' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for deletions
    const serviceClient = createServiceClient();

    const { error } = await serviceClient
      .from('aloa_project_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', projectId);

    if (error) {

      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}