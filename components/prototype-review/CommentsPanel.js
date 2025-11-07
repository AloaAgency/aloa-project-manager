'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageSquare,
  Send,
  Check,
  RotateCcw,
  Trash2,
  Clock,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * CommentsPanel - Side panel for displaying and managing comments
 *
 * Features:
 * - Slides in from right side
 * - Lists all comments with threading
 * - New comment form
 * - Reply functionality
 * - Resolve/reopen actions
 * - Smooth animations
 * - Professional layout matching Aloa aesthetic
 */

export default function CommentsPanel({
  isOpen,
  comments,
  activeCommentId,
  pendingComment,
  onClose,
  onCommentSubmit,
  onReplySubmit,
  onCommentResolve,
  onCommentDelete,
  onCancelPending,
  isSaving = false,
  errorMessage = ''
}) {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState(new Set());

  // Handle new comment submit
  const handleNewCommentSubmit = () => {
    if (commentText.trim()) {
      onCommentSubmit(commentText);
      setCommentText('');
    }
  };

  // Handle reply submit
  const handleReplySubmit = (commentId) => {
    if (replyText.trim()) {
      onReplySubmit(commentId, replyText);
      setReplyText('');
      setReplyingTo(null);
    }
  };

  // Toggle comment expansion
  const toggleExpanded = (commentId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get role badge color
  const getRoleBadge = (role) => {
    const badges = {
      client_admin: { label: 'Client Admin', color: 'bg-purple-100 text-purple-700' },
      client_participant: { label: 'Client', color: 'bg-blue-100 text-blue-700' },
      team_member: { label: 'Team', color: 'bg-gray-100 text-gray-700' },
      project_admin: { label: 'Admin', color: 'bg-red-100 text-red-700' }
    };
    return badges[role] || { label: 'User', color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full lg:w-[420px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-lg text-gray-900">Comments</h3>
                <span className="text-sm text-gray-500">({comments.length})</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Close panel"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Error message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {errorMessage}
              </div>
            )}

            {/* Pending New Comment */}
            {pendingComment && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                        {pendingComment.number}
                      </div>
                      <span className="font-semibold text-blue-900">New Comment</span>
                    </div>
                    <button
                      onClick={onCancelPending}
                      className="text-blue-400 hover:text-blue-600"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Describe the issue or feedback..."
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                    rows={3}
                    autoFocus
                  />

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleNewCommentSubmit}
                      disabled={!commentText.trim() || isSaving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Send className="w-4 h-4" />
                      {isSaving ? 'Saving…' : 'Add Comment'}
                    </button>
                    <button
                      onClick={onCancelPending}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Existing Comments */}
              {comments.length === 0 && !pendingComment ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No comments yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Switch to Commenting mode and click on the prototype to add one
                  </p>
                </div>
              ) : (
                comments.map((comment) => {
                  const isActive = activeCommentId === comment.id;
                  const isResolved = comment.status === 'resolved';
                  const isExpanded = expandedComments.has(comment.id);
                  const hasReplies = comment.replies && comment.replies.length > 0;
                  const roleBadge = getRoleBadge(comment.author_role);

                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        border rounded-lg transition-all
                        ${isActive
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 bg-white'
                        }
                        ${isResolved ? 'opacity-75' : ''}
                      `}
                    >
                      {/* Comment Header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center
                              font-bold text-white text-sm
                              ${isResolved ? 'bg-green-500' : 'bg-blue-500'}
                            `}>
                              {isResolved ? <Check className="w-4 h-4" /> : comment.number}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-900">
                                  {comment.author}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge.color}`}>
                                  {roleBadge.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {formatDate(comment.created_at)}
                              </div>
                            </div>
                          </div>

                          {isResolved && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                              <Check className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>

                        {/* Comment Text */}
                        <p className="text-sm text-gray-700 mb-3 ml-11">
                          {comment.text}
                        </p>

                        {/* Comment Actions */}
                        <div className="flex items-center gap-3 ml-11">
                          <button
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            disabled={isSaving}
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => onCommentResolve(comment.id)}
                            className="text-xs text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
                            disabled={isSaving}
                          >
                            {isResolved ? (
                              <>
                                <RotateCcw className="w-3 h-3" />
                                Reopen
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                Resolve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => onCommentDelete(comment.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            disabled={isSaving}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 ml-11 border-l-2 border-blue-500 pl-3"
                          >
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleReplySubmit(comment.id)}
                                disabled={!replyText.trim() || isSaving}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 font-medium"
                              >
                                <Send className="w-3 h-3" />
                                {isSaving ? 'Saving…' : 'Reply'}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Replies */}
                      {hasReplies && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          <button
                            onClick={() => toggleExpanded(comment.id)}
                            className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-medium">
                              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-4 pb-3 space-y-2"
                              >
                                {comment.replies.map((reply) => {
                                  const replyBadge = getRoleBadge(reply.author_role);

                                  return (
                                    <div
                                      key={reply.id}
                                      className="bg-white border border-gray-200 rounded-lg p-3"
                                    >
                                      <div className="flex items-start gap-2 mb-2">
                                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-xs text-gray-900">
                                              {reply.author}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${replyBadge.color}`}>
                                              {replyBadge.label}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-700 mb-1">
                                            {reply.text}
                                          </p>
                                          <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(reply.created_at)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Click on any marker to view or add replies
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
