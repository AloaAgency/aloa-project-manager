'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Link as LinkIcon, Eye, Loader, MessageSquare, Send, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * PrototypeReviewApplet - Phase 2 Implementation
 *
 * Visual commenting system like markup.io:
 * - Click anywhere on prototype to add numbered comment markers
 * - Side panel showing comment threads
 * - Percentage-based positioning for responsiveness
 * - Reply threading support
 */
const PrototypeReviewApplet = ({
  applet,
  isViewOnly,
  onClose,
  onComplete,
  projectId,
  userId,
  isAdmin = false
}) => {
  // State management
  const [prototypes, setPrototypes] = useState([]);
  const [selectedPrototype, setSelectedPrototype] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [prototypeUrl, setPrototypeUrl] = useState('');
  const [prototypeName, setPrototypeName] = useState('');
  const [prototypeDescription, setPrototypeDescription] = useState('');
  const [sourceType, setSourceType] = useState('upload'); // 'upload' or 'url'

  // Commenting state
  const [comments, setComments] = useState([]);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [activeComment, setActiveComment] = useState(null);
  const [newCommentPosition, setNewCommentPosition] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Refs
  const imageContainerRef = useRef(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedPrototype) {
          setSelectedPrototype(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedPrototype]);

  // Load prototypes for this applet
  useEffect(() => {
    if (applet.id) {
      loadPrototypes();
    }
  }, [applet.id]);

  // Load prototypes from API
  const loadPrototypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/aloa-projects/${projectId}/prototypes?appletId=${applet.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to load prototypes');
      }

      const data = await response.json();
      setPrototypes(data.prototypes || []);
    } catch (error) {
      console.error('Error loading prototypes:', error);
      toast.error('Failed to load prototypes');
    } finally {
      setIsLoading(false);
    }
  };

  // Load comments for selected prototype
  const loadComments = async (prototypeId) => {
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/prototypes/comments?prototypeId=${prototypeId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

  // Load comments when prototype selected
  useEffect(() => {
    if (selectedPrototype?.id) {
      loadComments(selectedPrototype.id);
      setShowCommentPanel(false);
      setNewCommentPosition(null);
      setReplyTo(null);
      setCommentText('');
    } else {
      setComments([]);
    }
  }, [selectedPrototype?.id]);

  // Handle click on image to add comment
  const handleImageClick = (e) => {
    if (isViewOnly) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewCommentPosition({ x, y });
    setShowCommentPanel(true);
    setReplyTo(null);
    setCommentText('');
  };

  // Submit new comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setIsSubmittingComment(true);

      const body = {
        prototypeId: selectedPrototype.id,
        commentText: commentText.trim(),
      };

      if (replyTo) {
        body.parentCommentId = replyTo.id;
      } else if (newCommentPosition) {
        body.xPercent = newCommentPosition.x;
        body.yPercent = newCommentPosition.y;
      }

      const response = await fetch(
        `/api/aloa-projects/${projectId}/prototypes/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      toast.success(replyTo ? 'Reply added' : 'Comment added');

      // Reset form
      setCommentText('');
      setNewCommentPosition(null);
      setReplyTo(null);

      // Reload comments
      await loadComments(selectedPrototype.id);
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Resolve comment
  const handleResolveComment = async (commentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'open' ? 'resolved' : 'open';

      const response = await fetch(
        `/api/aloa-projects/${projectId}/prototypes/comments`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId, status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      toast.success(newStatus === 'resolved' ? 'Comment resolved' : 'Comment reopened');
      await loadComments(selectedPrototype.id);
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/prototypes/comments?commentId=${commentId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      toast.success('Comment deleted');
      await loadComments(selectedPrototype.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (PNG, JPG, or WebP)');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setUploadFile(file);
      if (!prototypeName) {
        setPrototypeName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
      }
    }
  };

  // Handle prototype upload/creation
  const handleSubmitPrototype = async (e) => {
    e.preventDefault();

    if (!prototypeName.trim()) {
      toast.error('Please enter a prototype name');
      return;
    }

    if (sourceType === 'upload' && !uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (sourceType === 'url' && !prototypeUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      setIsLoading(true);

      let prototypeData;

      if (sourceType === 'upload') {
        // Upload file first
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('appletId', applet.id);
        formData.append('name', prototypeName);
        formData.append('description', prototypeDescription);

        const uploadResponse = await fetch(
          `/api/aloa-projects/${projectId}/prototypes/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload prototype');
        }

        prototypeData = await uploadResponse.json();
      } else {
        // Create prototype from URL
        const response = await fetch(
          `/api/aloa-projects/${projectId}/prototypes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appletId: applet.id,
              name: prototypeName,
              description: prototypeDescription,
              sourceType: 'url',
              sourceUrl: prototypeUrl,
              viewportWidth: 1920,
              viewportHeight: 1080,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create prototype');
        }

        prototypeData = await response.json();
      }

      toast.success('Prototype added successfully');

      // Reset form
      setUploadMode(false);
      setUploadFile(null);
      setPrototypeUrl('');
      setPrototypeName('');
      setPrototypeDescription('');

      // Reload prototypes
      await loadPrototypes();
    } catch (error) {
      console.error('Error creating prototype:', error);
      toast.error('Failed to add prototype');
    } finally {
      setIsLoading(false);
    }
  };

  // Render comment markers on prototype
  const renderCommentMarkers = () => {
    if (!comments || comments.length === 0) return null;

    return comments.map((comment, index) => {
      // Only render markers for top-level comments (not replies)
      if (comment.parent_comment_id) return null;

      return (
        <div
          key={comment.id}
          className="absolute cursor-pointer hover:scale-110 transition-transform"
          style={{
            left: `${comment.x_percent}%`,
            top: `${comment.y_percent}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveComment(comment);
            setShowCommentPanel(true);
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
            comment.status === 'resolved' ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            {index + 1}
          </div>
        </div>
      );
    });
  };

  // Render comment panel
  const renderCommentPanel = () => {
    if (!showCommentPanel) return null;

    return (
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-xl border-l border-gray-200 overflow-hidden flex flex-col z-20">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments ({comments.length})
          </h3>
          <button
            onClick={() => {
              setShowCommentPanel(false);
              setActiveComment(null);
              setReplyTo(null);
              setNewCommentPosition(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {newCommentPosition && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700 font-medium mb-2">New Comment</p>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingComment ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Add Comment
                </button>
                <button
                  onClick={() => {
                    setNewCommentPosition(null);
                    setCommentText('');
                  }}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {comments.map((comment, index) => (
            <div
              key={comment.id}
              className={`border rounded-lg p-3 ${
                activeComment?.id === comment.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              } ${comment.status === 'resolved' ? 'opacity-60' : ''}`}
            >
              {/* Comment Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    comment.status === 'resolved' ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{comment.author_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {comment.status === 'resolved' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Resolved
                  </span>
                )}
              </div>

              {/* Comment Text */}
              <p className="text-sm text-gray-700 mb-2">{comment.comment_text}</p>

              {/* Comment Actions */}
              <div className="flex gap-2">
                {!isViewOnly && (
                  <>
                    <button
                      onClick={() => {
                        setReplyTo(comment);
                        setShowCommentPanel(true);
                        setNewCommentPosition(null);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => handleResolveComment(comment.id, comment.status)}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                    >
                      {comment.status === 'resolved' ? 'Reopen' : 'Resolve'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 pl-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-xs">{reply.author_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(reply.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700">{reply.comment_text}</p>
                      {!isViewOnly && isAdmin && (
                        <button
                          onClick={() => handleDeleteComment(reply.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium mt-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {replyTo?.id === comment.id && (
                <div className="mt-3 ml-4 border-l-2 border-blue-500 pl-3">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={isSubmittingComment}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSubmittingComment ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyTo(null);
                        setCommentText('');
                      }}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {comments.length === 0 && !newCommentPosition && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No comments yet</p>
              <p className="text-gray-400 text-xs mt-1">Click on the prototype to add one</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render prototype viewer
  const renderPrototypeViewer = () => {
    if (!selectedPrototype) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <button
          onClick={() => setSelectedPrototype(null)}
          className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="w-full h-full flex">
          {/* Left side - Prototype image */}
          <div className={`flex-1 flex flex-col p-4 ${showCommentPanel ? 'mr-96' : ''}`}>
            {/* Header */}
            <div className="text-white mb-4">
              <h2 className="text-2xl font-bold">{selectedPrototype.name}</h2>
              {selectedPrototype.description && (
                <p className="text-gray-300 mt-1">{selectedPrototype.description}</p>
              )}
            </div>

            {/* Image Container with click capture */}
            <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center relative">
              {selectedPrototype.file_url || selectedPrototype.screenshot_url ? (
                <div
                  ref={imageContainerRef}
                  className="relative max-w-full max-h-full cursor-crosshair"
                  onClick={handleImageClick}
                >
                  <img
                    src={selectedPrototype.file_url || selectedPrototype.screenshot_url}
                    alt={selectedPrototype.name}
                    className="max-w-full max-h-full object-contain"
                  />
                  {/* Comment markers overlay */}
                  {renderCommentMarkers()}
                </div>
              ) : (
                <div className="text-gray-400">
                  <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                  <p>No image available</p>
                </div>
              )}
            </div>

            {/* Footer instructions */}
            {!isViewOnly && (
              <div className="mt-4 text-gray-400 text-sm flex items-center justify-between">
                <p>Click anywhere on the prototype to add a comment</p>
                <button
                  onClick={() => setShowCommentPanel(!showCommentPanel)}
                  className="px-3 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {showCommentPanel ? 'Hide' : 'Show'} Comments ({comments.length})
                </button>
              </div>
            )}
          </div>

          {/* Right side - Comment panel */}
          {renderCommentPanel()}
        </div>
      </div>
    );
  };

  // Render upload form
  const renderUploadForm = () => {
    return (
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Prototype</h3>
          <button
            onClick={() => setUploadMode(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitPrototype} className="space-y-4">
          {/* Source Type Selector */}
          <div className="flex gap-2 border-b pb-3">
            <button
              type="button"
              onClick={() => setSourceType('upload')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                sourceType === 'upload'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setSourceType('url')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                sourceType === 'url'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              From URL
            </button>
          </div>

          {/* Upload File */}
          {sourceType === 'upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadFile && (
                <p className="text-sm text-green-600 mt-1">Selected: {uploadFile.name}</p>
              )}
            </div>
          )}

          {/* URL Input */}
          {sourceType === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prototype URL
              </label>
              <input
                type="url"
                value={prototypeUrl}
                onChange={(e) => setPrototypeUrl(e.target.value)}
                placeholder="https://example.com/prototype"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Screenshots will be captured automatically (Phase 5)
              </p>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prototype Name *
            </label>
            <input
              type="text"
              value={prototypeName}
              onChange={(e) => setPrototypeName(e.target.value)}
              placeholder="e.g., Homepage Mockup v2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={prototypeDescription}
              onChange={(e) => setPrototypeDescription(e.target.value)}
              placeholder="Describe what's new or what feedback you need..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setUploadMode(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Uploading...' : 'Add Prototype'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Main render
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">{applet.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {applet.client_instructions || 'View and comment on prototypes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {uploadMode ? (
            renderUploadForm()
          ) : (
            <>
              {/* Admin Actions */}
              {isAdmin && !isViewOnly && (
                <div className="mb-6">
                  <button
                    onClick={() => setUploadMode(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Add Prototype
                  </button>
                </div>
              )}

              {/* Prototypes Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : prototypes.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No prototypes yet
                  </h3>
                  <p className="text-gray-500">
                    {isAdmin
                      ? 'Upload your first prototype to get started'
                      : 'Check back later for prototypes to review'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prototypes.map((prototype) => (
                    <div
                      key={prototype.id}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedPrototype(prototype)}
                    >
                      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                        {prototype.file_url || prototype.screenshot_url ? (
                          <img
                            src={prototype.file_url || prototype.screenshot_url}
                            alt={prototype.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-gray-300" />
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-gray-900 truncate">
                          {prototype.name}
                        </h4>
                        {prototype.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {prototype.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          <Eye className="w-3 h-3" />
                          <span>Click to view</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Prototype Viewer Modal */}
      {selectedPrototype && renderPrototypeViewer()}
    </div>
  );
};

export default PrototypeReviewApplet;
