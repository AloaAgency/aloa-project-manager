import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // Get team members for this project
    const { data: team, error } = await supabase
      .from('aloa_project_team')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team:', error);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      team: team || [],
      count: team?.length || 0
    });

  } catch (error) {
    console.error('Error in team route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { email, name, role } = await request.json();

    // Add new team member
    const { data: newMember, error } = await supabase
      .from('aloa_project_team')
      .insert([{
        project_id: projectId,
        email,
        name,
        role: role || 'viewer',
        permissions: {
          can_fill_forms: true,
          can_approve: role === 'client' || role === 'admin',
          can_edit_project: role === 'admin'
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding team member:', error);
      return NextResponse.json(
        { error: 'Failed to add team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: newMember
    });

  } catch (error) {
    console.error('Error adding team member:', error);
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

    const { error } = await supabase
      .from('aloa_project_team')
      .delete()
      .eq('id', memberId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error removing team member:', error);
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
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}