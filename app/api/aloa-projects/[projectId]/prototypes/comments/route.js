import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/aloa-projects/[projectId]/prototypes/comments
 * List all comments for a prototype (with threading)
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const prototypeId = searchParams.get('prototypeId');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prototypeId) {
      return NextResponse.json(
        { error: 'prototypeId is required' },
        { status: 400 }
      );
    }

    // Fetch all comments for this prototype (not deleted) and scoped to project
    const { data: comments, error } = await supabase
      .from('aloa_prototype_comments')
      .select('*')
      .eq('prototype_id', prototypeId)
      .eq('aloa_project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments', details: error.message },
        { status: 500 }
      );
    }

    // Fetch author roles separately to avoid FK relationship issues
    if (Array.isArray(comments) && comments.length > 0) {
      const authorIds = [...new Set(comments.map(c => c.author_id).filter(Boolean))];

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('aloa_user_profiles')
          .select('id, role')
          .in('id', authorIds);

        const roleMap = {};
        if (profiles) {
          profiles.forEach(p => {
            roleMap[p.id] = p.role;
          });
        }

        // Attach roles to comments
        comments.forEach((c) => {
          c.author_role = roleMap[c.author_id] || null;
        });
      }
    }

    // Organize into threads (top-level comments + replies)
    const commentMap = {};
    const topLevel = [];

    comments.forEach((comment) => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    comments.forEach((comment) => {
      if (comment.parent_comment_id) {
        // This is a reply
        const parent = commentMap[comment.parent_comment_id];
        if (parent) {
          parent.replies.push(commentMap[comment.id]);
        }
      } else {
        // This is a top-level comment
        topLevel.push(commentMap[comment.id]);
      }
    });

    return NextResponse.json({
      success: true,
      comments: topLevel,
      totalCount: comments.length,
    });
  } catch (error) {
    console.error('Unexpected error in GET /comments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/aloa-projects/[projectId]/prototypes/comments
 * Create a new comment (or reply to existing comment)
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure a profile row exists for this user (for FK author_id)
    try {
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: existingProfile } = await service
        .from('aloa_user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (!existingProfile) {
        await service.from('aloa_user_profiles').insert([{
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
          // role uses table default
        }]);
      }
    } catch (e) {
      // Non-fatal: if insert fails due to RLS or constraints, the FK may still pass
      // and RLS on comments will govern access.
    }

    const body = await request.json();
    const {
      prototypeId,
      commentText,
      xPercent,
      yPercent,
      parentCommentId,
    } = body;

    // Verify prototype exists and belongs to this project
    // Note: For prototype_review applets opened from admin, prototypeId might be an applet ID
    // We'll allow this for super_admins/project_admins
    const { data: protoCheck, error: protoErr } = await supabase
      .from('aloa_prototypes')
      .select('id')
      .eq('id', prototypeId)
      .eq('aloa_project_id', projectId)
      .maybeSingle();

    if (protoErr) {
      console.error('Prototype check failed:', protoErr);
      return NextResponse.json(
        { error: 'Failed to validate prototype', details: protoErr.message },
        { status: 500 }
      );
    }

    // If prototype not found, check if user is super_admin/project_admin
    // and create a prototype record on-the-fly for applet-based prototypes
    if (!protoCheck) {
      const { data: profile } = await supabase
        .from('aloa_user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile && ['super_admin', 'project_admin'].includes(profile.role);

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Prototype not found for this project' },
          { status: 400 }
        );
      }

      // Create a prototype record for this applet-based prototype
      // Use service role to bypass RLS
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { error: createErr } = await service
        .from('aloa_prototypes')
        .insert({
          id: prototypeId,
          aloa_project_id: projectId,
          name: 'Prototype Review',
          description: 'Auto-created for admin prototype review',
          source_type: 'url', // External URL
          version: '1.0',
          status: 'active',
          viewport_width: 1920,
          viewport_height: 1080,
          device_type: 'desktop',
          is_current_version: true,
          total_comments: 0,
          open_comments: 0,
          resolved_comments: 0,
          created_by: user.id,
        });

      if (createErr) {
        console.error('Failed to create prototype record:', createErr);
        // Continue anyway - it might already exist from a concurrent request
      }
    }

    // Validation
    const trimmed = (commentText || '').trim();
    if (!prototypeId || !trimmed) {
      return NextResponse.json(
        { error: 'prototypeId and commentText are required' },
        { status: 400 }
      );
    }
    if (trimmed.length > 5000) {
      return NextResponse.json(
        { error: 'commentText exceeds maximum length (5000)' },
        { status: 400 }
      );
    }

    // Get user info
    const authorName = user.user_metadata?.full_name ||
                       user.email ||
                       'Unknown User';
    const authorEmail = user.email;

    // Create comment
    const commentData = {
      prototype_id: prototypeId,
      aloa_project_id: projectId,
      comment_text: trimmed,
      author_id: user.id,
      author_name: authorName,
      author_email: authorEmail,
      status: 'open',
    };

    // Add positioning for top-level comments (not replies)
    if (!parentCommentId) {
      if (xPercent === undefined || yPercent === undefined) {
        return NextResponse.json(
          { error: 'xPercent and yPercent required for new comment markers' },
          { status: 400 }
        );
      }
      const clamp = (n) => Math.max(0, Math.min(100, Number(n)));
      commentData.x_percent = clamp(xPercent);
      commentData.y_percent = clamp(yPercent);
    } else {
      // This is a reply - link to parent
      commentData.parent_comment_id = parentCommentId;
    }

    const { data: newComment, error } = await supabase
      .from('aloa_prototype_comments')
      .insert([commentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Failed to create comment', details: error.message },
        { status: 500 }
      );
    }

    // Log to timeline
    try {
      const eventType = parentCommentId
        ? 'prototype_comment_replied'
        : 'prototype_comment_added';
      const description = `${authorName} ${parentCommentId ? 'replied to' : 'added'} a prototype comment`;

      await supabase.from('aloa_project_timeline').insert([
        {
          project_id: projectId,
          event_type: eventType,
          description,
          user_id: user.id,
          metadata: {
            comment_id: newComment.id,
            prototype_id: prototypeId,
            parent_comment_id: parentCommentId,
            comment_preview: commentText.substring(0, 100),
          },
        },
      ]);
    } catch (timelineError) {
      console.error('Timeline logging failed:', timelineError);
      // Don't fail the request if timeline fails
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
    });
  } catch (error) {
    console.error('Unexpected error in POST /comments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/aloa-projects/[projectId]/prototypes/comments
 * Update a comment (edit text, resolve, etc.)
 */
export async function PATCH(request, { params }) {
  try {
    const { projectId } = params;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, commentText, status } = body;

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      );
    }

    const updates = {};

    if (commentText !== undefined) {
      const trimmed = commentText.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: 'commentText cannot be empty' },
          { status: 400 }
        );
      }
      if (trimmed.length > 5000) {
        return NextResponse.json(
          { error: 'commentText exceeds maximum length (5000)' },
          { status: 400 }
        );
      }
      updates.comment_text = trimmed;
      updates.edited_by = user.id;
    }

    if (status !== undefined) {
      if (!['open', 'resolved'].includes(status)) {
        return NextResponse.json(
          { error: 'status must be "open" or "resolved"' },
          { status: 400 }
        );
      }
      updates.status = status;
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user.id;
      } else {
        updates.resolved_at = null;
        updates.resolved_by = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Update comment (RLS will enforce author/admin check)
    const { data: updatedComment, error } = await supabase
      .from('aloa_prototype_comments')
      .update(updates)
      .eq('id', commentId)
      .eq('aloa_project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json(
        { error: 'Failed to update comment', details: error.message },
        { status: 500 }
      );
    }

    // Log to timeline
    try {
      const userName = user.user_metadata?.full_name ||
                       user.email ||
                       'Unknown User';
      const eventType = status === 'resolved'
        ? 'prototype_comment_resolved'
        : 'prototype_comment_updated';
      const description = `${userName} ${status === 'resolved' ? 'resolved' : 'updated'} a prototype comment`;

      await supabase.from('aloa_project_timeline').insert([
        {
          project_id: projectId,
          event_type: eventType,
          description,
          user_id: user.id,
          metadata: {
            comment_id: commentId,
            updated_fields: Object.keys(updates),
          },
        },
      ]);
    } catch (timelineError) {
      console.error('Timeline logging failed:', timelineError);
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment,
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /comments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/aloa-projects/[projectId]/prototypes/comments
 * Soft-delete a comment
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {}
        }
      }
    );

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      );
    }

    // Soft delete (RLS will enforce author/admin check)
    const { data: deletedComment, error } = await supabase
      .from('aloa_prototype_comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', commentId)
      .eq('aloa_project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json(
        { error: 'Failed to delete comment', details: error.message },
        { status: 500 }
      );
    }

    // Log to timeline
    try {
      const userName = user.user_metadata?.full_name ||
                       user.email ||
                       'Unknown User';

      await supabase.from('aloa_project_timeline').insert([
        {
          project_id: projectId,
          event_type: 'prototype_comment_deleted',
          description: `${userName} deleted a prototype comment`,
          user_id: user.id,
          metadata: {
            comment_id: commentId,
          },
        },
      ]);
    } catch (timelineError) {
      console.error('Timeline logging failed:', timelineError);
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /comments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
