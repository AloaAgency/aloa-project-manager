import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/chat/[projectId] - Get all conversations for a project
export async function GET(request, { params }) {
  const supabase = await createClient();
  const { projectId } = params;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check if they're a super admin
    const { data: userProfileData } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = userProfileData?.role === 'super_admin';

    // Check if user has access to project (skip for super admins)
    if (!isSuperAdmin) {
      const { data: memberCheck } = await supabase
        .from('aloa_project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!memberCheck) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get conversations with participant info
    const { data: conversations, error } = await supabase
      .from('aloa_chat_conversations')
      .select(`
        *,
        participants:aloa_chat_participants(
          user_id,
          last_read_at,
          user:aloa_user_profiles(
            id,
            full_name,
            email,
            role
          )
        ),
        last_message:aloa_chat_messages(
          content,
          created_at,
          sender:aloa_user_profiles(
            full_name,
            role
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Get unread counts for current user
    const userProfile = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const conversationsWithUnread = conversations.map(conv => ({
      ...conv,
      unread_count: userProfile.data?.role?.includes('client')
        ? conv.unread_count_client
        : conv.unread_count_agency,
      last_message: conv.last_message?.[0] || null
    }));

    return NextResponse.json({ conversations: conversationsWithUnread });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/chat/[projectId] - Create a new conversation
export async function POST(request, { params }) {
  const supabase = await createClient();
  const { projectId } = params;

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, description } = body;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check if they're a super admin
    const { data: userProfileData, error: profileError } = await supabase
      .from('aloa_user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    const isSuperAdmin = userProfileData?.role === 'super_admin';

    // Check if user has access to project (skip for super admins)
    if (!isSuperAdmin) {
      const { data: memberCheck, error: memberError } = await supabase
        .from('aloa_project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (memberError) {
        console.error('Error checking project membership:', memberError);
      }

      if (!memberCheck) {
        console.error('User is not a project member');
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('aloa_chat_conversations')
      .insert({
        project_id: projectId,
        title: title || 'Project Discussion',
        description,
        created_by: user.id
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      throw convError;
    }

    // Add creator as a participant
    const { data: participantData, error: participantError } = await supabase
      .from('aloa_chat_participants')
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        joined_at: new Date().toISOString()
      })
      .select();

    if (participantError) {
      console.error('Error adding creator as participant:', participantError);
      // Don't throw here, continue trying to add other participants
    }

    // Add all project members as participants
    const { data: projectMembers, error: membersError } = await supabase
      .from('aloa_project_members')
      .select('user_id')
      .eq('project_id', projectId);

    if (membersError) {
      console.error('Error fetching project members:', membersError);
    }

    if (projectMembers && projectMembers.length > 0) {
      const participants = projectMembers
        .filter(member => member.user_id !== user.id) // Exclude creator (already added)
        .map(member => ({
          conversation_id: conversation.id,
          user_id: member.user_id,
          joined_at: new Date().toISOString()
        }));

      if (participants.length > 0) {
        const { data: addedParticipants, error: addError } = await supabase
          .from('aloa_chat_participants')
          .insert(participants)
          .select();

        if (addError) {
          console.error('Error adding project members as participants:', addError);
          // Don't throw here, conversation is already created
        }
      }
    }

    return NextResponse.json({ conversation });

  } catch (error) {
    console.error('Fatal error creating conversation:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({
      error: 'Failed to create conversation',
      details: error.message
    }, { status: 500 });
  }
}