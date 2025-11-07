'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, MessageSquare, Eye, MousePointer2, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ModeToggle from '@/components/prototype-review/ModeToggle';
import CommentMarker from '@/components/prototype-review/CommentMarker';
import CommentsPanel from '@/components/prototype-review/CommentsPanel';

/**
 * Prototype Review - Full Screen Dedicated Window
 *
 * This is the MAIN prototype review interface that opens in a dedicated window.
 * It mimics markup.io's behavior with:
 * - Full-screen iframe for viewing external prototypes
 * - Browsing mode (just view) vs Commenting mode (add markers)
 * - Click-to-place numbered comment markers
 * - Side panel with comment threads
 * - Professional clean UI matching Aloa aesthetic
 */

// Map API comment shape to UI shape
function mapApiComment(c) {
  return {
    id: c.id,
    number: c.comment_number ?? c.number ?? null,
    x_percent: c.x_percent ?? null,
    y_percent: c.y_percent ?? null,
    author: c.author_name || c.author_email || 'Unknown User',
    author_role: c.author_role || null,
    text: c.comment_text || c.text || '',
    status: c.status || 'open',
    created_at: c.created_at,
    replies: Array.isArray(c.replies) ? c.replies.map(mapApiComment) : [],
  };
}

export default function PrototypeReviewPage({ params }) {
  // Get URL from query params
  const searchParams = useSearchParams();
  const urlFromQuery = searchParams.get('url');
  const projectIdFromQuery = searchParams.get('projectId');
  const nameFromQuery = searchParams.get('name');

  // Mode state: 'browsing' or 'commenting'
  const [mode, setMode] = useState('browsing');

  // Comments state
  const [comments, setComments] = useState([]);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);

  // New comment placement
  const [pendingComment, setPendingComment] = useState(null);

  // Prototype data
  const [prototype, setPrototype] = useState({ id: params.prototypeId, name: 'Prototype Review', url: '', description: '', created_at: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Iframe error handling
  const [iframeError, setIframeError] = useState(false);
  const [iframeErrorMessage, setIframeErrorMessage] = useState('');
  const [attemptedRefresh, setAttemptedRefresh] = useState(false);

  // Refs
  const iframeContainerRef = useRef(null);
  const iframeRef = useRef(null);

  // Update prototype state from query params
  useEffect(() => {
    const updates = {};
    if (urlFromQuery) {
      updates.url = urlFromQuery;
      updates.description = `Reviewing: ${urlFromQuery}`;
    }
    if (nameFromQuery) {
      updates.name = nameFromQuery;
    }
    if (Object.keys(updates).length) {
      setPrototype(prev => ({ ...prev, ...updates }));
    }
  }, [urlFromQuery, nameFromQuery]);

  // Load comments from API
  const loadComments = useCallback(async () => {
    if (!projectIdFromQuery || !params.prototypeId) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`/api/aloa-projects/${projectIdFromQuery}/prototypes/comments?prototypeId=${encodeURIComponent(params.prototypeId)}`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to load comments');
      }
      const data = await res.json();
      const mapped = Array.isArray(data?.comments) ? data.comments.map(mapApiComment) : [];
      setComments(mapped);
    } catch (e) {
      console.error('Failed to load comments', e);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [projectIdFromQuery, params.prototypeId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Try to refresh signed URL if it may have expired
  const refreshPrototypeUrl = useCallback(async () => {
    if (!projectIdFromQuery || !params.prototypeId) return false;
    try {
      const res = await fetch(`/api/aloa-projects/${projectIdFromQuery}/prototypes/${params.prototypeId}/signed-url`);
      if (!res.ok) return false;
      const data = await res.json();
      const nextUrl = data?.file_url || data?.screenshot_url || null;
      if (nextUrl) {
        setPrototype(prev => ({ ...prev, url: nextUrl }));
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }, [projectIdFromQuery, params.prototypeId]);

  // Handle ESC key to close or toggle modes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (pendingComment) {
          setPendingComment(null);
        } else if (showCommentsPanel) {
          setShowCommentsPanel(false);
        } else if (mode === 'commenting') {
          setMode('browsing');
        } else {
          // Close window if user wants to exit
          if (window.confirm('Close prototype review?')) {
            window.close();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showCommentsPanel, pendingComment]);

  // Handle mode toggle
  const handleModeToggle = () => {
    const newMode = mode === 'browsing' ? 'commenting' : 'browsing';
    setMode(newMode);

    // Auto-show comments panel when entering commenting mode
    if (newMode === 'commenting') {
      setShowCommentsPanel(true);
    }
  };

  // Handle click on iframe overlay to place comment
  const handleOverlayClick = (e) => {
    if (mode !== 'commenting') return;

    const rect = iframeContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Create pending comment position
    setPendingComment({
      x_percent: x,
      y_percent: y,
      number: comments.length + 1
    });

    // Show comments panel
    setShowCommentsPanel(true);
  };

  // Handle marker click
  const handleMarkerClick = (comment) => {
    setActiveCommentId(comment.id);
    setShowCommentsPanel(true);
  };

  // Handle new comment submission
  const handleCommentSubmit = async (text) => {
    if (!pendingComment || !text.trim() || !projectIdFromQuery) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/aloa-projects/${projectIdFromQuery}/prototypes/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prototypeId: params.prototypeId,
          commentText: text.trim(),
          xPercent: pendingComment.x_percent,
          yPercent: pendingComment.y_percent,
        })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to add comment');
      }
      const data = await res.json();
      const saved = mapApiComment(data?.comment || {});
      setComments(prev => [...prev, saved]);
      setPendingComment(null);
      setActiveCommentId(saved.id);
    } catch (e) {
      console.error('Add comment failed', e);
      setError('Failed to add comment');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async (commentId, text) => {
    if (!text.trim() || !projectIdFromQuery) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/aloa-projects/${projectIdFromQuery}/prototypes/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prototypeId: params.prototypeId,
          commentText: text.trim(),
          parentCommentId: commentId,
        })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to add reply');
      }
      const data = await res.json();
      const saved = mapApiComment(data?.comment || {});
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, replies: [...(c.replies || []), saved] } : c));
    } catch (e) {
      console.error('Add reply failed', e);
      setError('Failed to add reply');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle comment resolve
  const handleCommentResolve = async (commentId) => {
    if (!projectIdFromQuery) return;
    const target = comments.find(c => c.id === commentId);
    if (!target) return;
    const nextStatus = target.status === 'open' ? 'resolved' : 'open';
    try {
      setIsSaving(true);
      const res = await fetch(`/api/aloa-projects/${projectIdFromQuery}/prototypes/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, status: nextStatus })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to update');
      }
      const data = await res.json();
      const updated = mapApiComment(data?.comment || {});
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: updated.status, created_at: updated.created_at } : c));
    } catch (e) {
      console.error('Resolve toggle failed', e);
      setError('Failed to update comment');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle comment delete
  const handleCommentDelete = async (commentId) => {
    if (!projectIdFromQuery) return;
    if (!confirm('Delete this comment?')) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/aloa-projects/${projectIdFromQuery}/prototypes/comments?commentId=${encodeURIComponent(commentId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Failed to delete');
      }
      setComments(prev => prev.filter(c => c.id !== commentId));
      if (activeCommentId === commentId) setActiveCommentId(null);
    } catch (e) {
      console.error('Delete failed', e);
      setError('Failed to delete comment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.close()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="border-l pl-4">
            <h1 className="font-bold text-lg text-gray-900">{prototype.name}</h1>
            <p className="text-sm text-gray-500">{prototype.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Comments counter */}
          <button
            onClick={() => setShowCommentsPanel(!showCommentsPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </span>
          </button>

          {/* Mode Toggle */}
          <ModeToggle mode={mode} onToggle={handleModeToggle} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Iframe Container */}
        <div
          ref={iframeContainerRef}
          className="absolute inset-0"
        >
          {/* Dark overlay in commenting mode */}
          <AnimatePresence>
            {mode === 'commenting' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black bg-opacity-20 z-10 cursor-crosshair"
                onClick={handleOverlayClick}
              />
            )}
          </AnimatePresence>

          {/* Error banner */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Iframe Error Message */}
          {iframeError && (
            <div className="absolute inset-0 bg-white z-30 flex items-center justify-center p-8">
              <div className="max-w-2xl text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Unable to Load Prototype
                </h2>
                <p className="text-gray-600 mb-6">
                  {iframeErrorMessage || 'This website cannot be embedded due to security restrictions (X-Frame-Options or CSP headers).'}
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Trying to view:</strong>
                  </p>
                  <p className="text-sm text-gray-600 break-all">{prototype.url}</p>
                </div>
                <div className="space-y-3">
                  <a
                    href={prototype.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Open in New Tab
                    <X className="w-4 h-4 rotate-45" />
                  </a>
                  <p className="text-xs text-gray-500 mt-4">
                    💡 <strong>Tip:</strong> Try using a Vercel deployment, Figma prototype link, or a website that allows iframe embedding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Iframe */}
          <iframe
            ref={iframeRef}
            src={prototype.url}
            className="w-full h-full border-0"
            title={prototype.name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="fullscreen"
            onError={async () => {
              console.error('Iframe onError triggered');
              if (!attemptedRefresh) {
                setAttemptedRefresh(true);
                const ok = await refreshPrototypeUrl();
                if (ok) {
                  // Give the iframe a moment to update src via state change
                  setTimeout(() => {
                    setIframeError(false);
                    setIframeErrorMessage('');
                  }, 50);
                  return;
                }
              }
              setIframeError(true);
              setIframeErrorMessage('Failed to load the prototype. The site may block iframe embedding or the link may have expired.');
            }}
            onLoad={() => {
              console.log('Iframe onLoad triggered');
              // Try to detect if iframe was blocked by CSP/X-Frame-Options
              setTimeout(() => {
                try {
                  if (iframeRef.current) {
                    // Try to access the iframe's document
                    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;

                    if (!iframeDoc) {
                      // Can't access document - likely blocked
                      console.warn('Cannot access iframe document - CSP/CORS blocked');
                      // Do not immediately error; access is often blocked cross-origin.
                      // We'll rely on onError for hard failures.
                      return;
                    }

                    // Check if iframe body is empty (CSP blocked but page loaded)
                    const bodyContent = iframeDoc.body?.innerHTML || '';
                    // If empty, may still be rendering or blocked; onError handler will handle hard failures.

                    // Success - iframe loaded properly
                    console.log('Iframe loaded successfully');
                    setIframeError(false);
                  }
                } catch (e) {
                  // CORS/CSP error when trying to access iframe
                  console.warn('Iframe access not permitted (CORS/CSP) – this can be normal for external sites.');
                }
              }, 1500); // Wait a bit for page to render
            }}
          />

          {/* Comment Markers Overlay */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="pointer-events-auto"
                style={{
                  position: 'absolute',
                  left: `${comment.x_percent}%`,
                  top: `${comment.y_percent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <CommentMarker
                  comment={comment}
                  isActive={activeCommentId === comment.id}
                  onClick={() => handleMarkerClick(comment)}
                />
              </div>
            ))}

            {/* Pending comment marker */}
            {pendingComment && (
              <div
                className="pointer-events-none"
                style={{
                  position: 'absolute',
                  left: `${pendingComment.x_percent}%`,
                  top: `${pendingComment.y_percent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-10 h-10 rounded-full bg-blue-500 border-4 border-white shadow-lg flex items-center justify-center text-white font-bold"
                >
                  {pendingComment.number}
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Side Panel */}
        <CommentsPanel
          isOpen={showCommentsPanel}
          comments={comments}
          activeCommentId={activeCommentId}
          pendingComment={pendingComment}
          onClose={() => setShowCommentsPanel(false)}
          onCommentSubmit={handleCommentSubmit}
          onReplySubmit={handleReplySubmit}
          onCommentResolve={handleCommentResolve}
          onCommentDelete={handleCommentDelete}
          onCancelPending={() => setPendingComment(null)}
          isSaving={isSaving}
          errorMessage={error}
        />
      </div>

      {/* Bottom Instructions Bar (only in commenting mode) */}
      <AnimatePresence>
        {mode === 'commenting' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="bg-blue-50 border-t border-blue-200 px-6 py-3 z-30"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
              <MousePointer2 className="w-4 h-4" />
              <span className="font-medium">Click anywhere on the prototype to add a comment</span>
              <span className="text-blue-500">•</span>
              <span>Press ESC to cancel</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global loading/saving indicators */}
      {isLoading && (
        <div className="absolute top-4 left-4 z-40 bg-white/80 backdrop-blur px-3 py-1.5 rounded shadow border text-sm text-gray-700 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading comments…
        </div>
      )}
      {isSaving && (
        <div className="absolute top-4 right-4 z-40 bg-white/80 backdrop-blur px-3 py-1.5 rounded shadow border text-sm text-gray-700 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving…
        </div>
      )}
    </div>
  );
}
