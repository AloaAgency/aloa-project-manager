import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/aloa-projects/[projectId]/prototypes/comments
 * List all comments for a prototype (with threading)
 */
export async function GET(request, { params }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const prototypeId = searchParams.get('prototypeId');

    // Authenticate
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!prototypeId) {
      return NextResponse.json(
        { error: 'prototypeId is required' },
        { status: 400 }
      );
    }

    // Fetch all comments for this prototype (not deleted)
    const { data: comments, error } = await supabase
      .from('aloa_prototype_comments')
      .select('*')
      .eq('prototype_id', prototypeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments', details: error.message },
        { status: 500 }
      );
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
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;

    // Authenticate
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      prototypeId,
      commentText,
      xPercent,
      yPercent,
      parentCommentId,
    } = body;

    // Validation
    if (!prototypeId || !commentText?.trim()) {
      return NextResponse.json(
        { error: 'prototypeId and commentText are required' },
        { status: 400 }
      );
    }

    // Get user info from session
    const authorName = session.user.user_metadata?.full_name ||
                       session.user.email ||
                       'Unknown User';
    const authorEmail = session.user.email;

    // Create comment
    const commentData = {
      prototype_id: prototypeId,
      aloa_project_id: projectId,
      comment_text: commentText.trim(),
      author_id: session.user.id,
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
      commentData.x_percent = xPercent;
      commentData.y_percent = yPercent;
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
      await supabase.from('aloa_project_timeline').insert([
        {
          aloa_project_id: projectId,
          user_id: session.user.id,
          user_name: authorName,
          action: parentCommentId ? 'comment_replied' : 'comment_added',
          entity_type: 'prototype_comment',
          entity_id: newComment.id,
          entity_name: `Comment on prototype`,
          metadata: {
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
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;

    // Authenticate
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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
      updates.comment_text = commentText.trim();
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
        updates.resolved_by = session.user.id;
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
      const userName = session.user.user_metadata?.full_name ||
                       session.user.email ||
                       'Unknown User';

      await supabase.from('aloa_project_timeline').insert([
        {
          aloa_project_id: projectId,
          user_id: session.user.id,
          user_name: userName,
          action: status === 'resolved' ? 'comment_resolved' : 'comment_updated',
          entity_type: 'prototype_comment',
          entity_id: commentId,
          entity_name: `Comment updated`,
          metadata: {
            updates: Object.keys(updates),
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
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    // Authenticate
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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
      })
      .eq('id', commentId)
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
      const userName = session.user.user_metadata?.full_name ||
                       session.user.email ||
                       'Unknown User';

      await supabase.from('aloa_project_timeline').insert([
        {
          aloa_project_id: projectId,
          user_id: session.user.id,
          user_name: userName,
          action: 'comment_deleted',
          entity_type: 'prototype_comment',
          entity_id: commentId,
          entity_name: `Comment deleted`,
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
