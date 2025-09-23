import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET all stakeholders for a project
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    const { data: stakeholders, error } = await supabase
      .from('aloa_client_stakeholders')
      .select('*')
      .eq('project_id', projectId)
      .order('importance_score', { ascending: false })
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    if (error) {

      return NextResponse.json(
        { error: 'Failed to fetch stakeholders' },
        { status: 500 }
      );
    }

    // If stakeholders found, fetch user profile data for those with user_id
    if (stakeholders && stakeholders.length > 0) {
      const userIds = stakeholders.filter(s => s.user_id).map(s => s.user_id);
      if (userIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('aloa_user_profiles')
          .select('id, email, full_name, avatar_url, role')
          .in('id', userIds);

        // Map user profiles to stakeholders
        if (userProfiles) {
          stakeholders.forEach(stakeholder => {
            if (stakeholder.user_id) {
              const userProfile = userProfiles.find(u => u.id === stakeholder.user_id);
              stakeholder.user = userProfile || null;
            }
          });
        }
      }
    }

    return NextResponse.json({
      stakeholders: stakeholders || [],
      count: stakeholders?.length || 0
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new stakeholder
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    // Handle user account creation if requested
    let userId = body.user_id;
    if (body.create_user && body.email) {
      try {
        // Create user invitation
        const inviteResponse = await fetch(`${request.nextUrl.origin}/api/auth/users/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            email: body.email,
            full_name: body.name,
            role: body.user_role || 'client',
            send_email: true
          })
        });

        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          userId = inviteData.user?.id;

          // If it's a client-type role, assign them to this project
          const clientRoles = ['client', 'client_admin', 'client_participant'];
          if (clientRoles.includes(body.user_role) || !body.user_role) {
            const assignResponse = await fetch(`${request.nextUrl.origin}/api/auth/users/assign-project`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || ''
              },
              body: JSON.stringify({
                userId: userId,
                projectId: projectId
              })
            });

            if (!assignResponse.ok) {

            }
          }
        } else {
          const errorData = await inviteResponse.json();

          // Continue without user account if creation fails
        }
      } catch (error) {

        // Continue without user account if creation fails
      }
    }

    const stakeholderData = {
      project_id: projectId,
      user_id: userId || null,
      name: body.name,
      title: body.title || null,
      role: body.role || null,
      email: body.email || null,
      phone: body.phone || null,
      bio: body.bio || null,
      responsibilities: body.responsibilities || null,
      preferences: body.preferences || null,
      avatar_url: body.avatar_url || null,
      linkedin_url: body.linkedin_url || null,
      importance_score: body.importance_score || 5,
      is_primary: body.is_primary || false,
      metadata: body.metadata || {},
      created_by: body.created_by || 'admin'
    };

    // If setting as primary, unset other primary stakeholders
    if (stakeholderData.is_primary) {
      await supabase
        .from('aloa_client_stakeholders')
        .update({ is_primary: false })
        .eq('project_id', projectId)
        .eq('is_primary', true);
    }

    const { data: stakeholder, error } = await supabase
      .from('aloa_client_stakeholders')
      .insert([stakeholderData])
      .select()
      .single();

    // If stakeholder has user_id, fetch the user profile
    if (stakeholder && stakeholder.user_id) {
      const { data: userProfile } = await supabase
        .from('aloa_user_profiles')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', stakeholder.user_id)
        .single();

      if (userProfile) {
        stakeholder.user = userProfile;
      }
    }

    if (error) {

      return NextResponse.json(
        { error: 'Failed to create stakeholder' },
        { status: 500 }
      );
    }

    // If user_id is provided, also add them to project_members table
    if (stakeholderData.user_id) {
      // Check if user is already a project member
      const { data: existingMember } = await supabase
        .from('aloa_project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', stakeholderData.user_id)
        .single();

      if (!existingMember) {
        // Add user as a project member with 'viewer' role (client role)
        await supabase
          .from('aloa_project_members')
          .insert({
            project_id: projectId,
            user_id: stakeholderData.user_id,
            project_role: 'viewer',
            added_by: body.created_by || 'admin'
          });
      }
    }

    // Trigger AI context update to include new stakeholder info
    await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

    return NextResponse.json({
      success: true,
      stakeholder
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a stakeholder
export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholderId');

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'Stakeholder ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Handle user account creation if requested for existing stakeholder
    let userId = body.user_id;
    if (body.create_user && body.email && !body.user_id) {
      try {
        // Create user invitation
        const inviteResponse = await fetch(`${request.nextUrl.origin}/api/auth/users/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            email: body.email,
            full_name: body.name,
            role: body.user_role || 'client',
            send_email: true
          })
        });

        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          userId = inviteData.user?.id;

          // If it's a client-type role, assign them to this project
          const clientRoles = ['client', 'client_admin', 'client_participant'];
          if (clientRoles.includes(body.user_role) || !body.user_role) {
            const assignResponse = await fetch(`${request.nextUrl.origin}/api/auth/users/assign-project`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': request.headers.get('cookie') || ''
              },
              body: JSON.stringify({
                userId: userId,
                projectId: projectId
              })
            });

            if (!assignResponse.ok) {

            }
          }
        } else {
          const errorData = await inviteResponse.json();

        }
      } catch (error) {

      }
    }

    // Remove undefined values
    const updateData = {};
    if (userId !== undefined) updateData.user_id = userId;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.responsibilities !== undefined) updateData.responsibilities = body.responsibilities;
    if (body.preferences !== undefined) updateData.preferences = body.preferences;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    if (body.linkedin_url !== undefined) updateData.linkedin_url = body.linkedin_url;
    if (body.importance_score !== undefined) updateData.importance_score = body.importance_score;
    if (body.is_primary !== undefined) updateData.is_primary = body.is_primary;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // If setting as primary, unset other primary stakeholders
    if (updateData.is_primary === true) {
      await supabase
        .from('aloa_client_stakeholders')
        .update({ is_primary: false })
        .eq('project_id', projectId)
        .eq('is_primary', true)
        .neq('id', stakeholderId);
    }

    const { data: stakeholder, error } = await supabase
      .from('aloa_client_stakeholders')
      .update(updateData)
      .eq('id', stakeholderId)
      .eq('project_id', projectId)
      .select()
      .single();

    // If stakeholder has user_id, fetch the user profile
    if (stakeholder && stakeholder.user_id) {
      const { data: userProfile } = await supabase
        .from('aloa_user_profiles')
        .select('id, email, full_name, avatar_url, role')
        .eq('id', stakeholder.user_id)
        .single();

      if (userProfile) {
        stakeholder.user = userProfile;
      }
    }

    if (error) {

      return NextResponse.json(
        { error: 'Failed to update stakeholder' },
        { status: 500 }
      );
    }

    // Trigger AI context update
    await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

    return NextResponse.json({
      success: true,
      stakeholder
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a stakeholder
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholderId');

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'Stakeholder ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('aloa_client_stakeholders')
      .delete()
      .eq('id', stakeholderId)
      .eq('project_id', projectId);

    if (error) {

      return NextResponse.json(
        { error: 'Failed to delete stakeholder' },
        { status: 500 }
      );
    }

    // Trigger AI context update
    await supabase.rpc('update_project_ai_context', { p_project_id: projectId });

    return NextResponse.json({
      success: true,
      message: 'Stakeholder deleted successfully'
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}