'use client';

import { useState, useEffect, useRef } from 'react';
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

// Dummy data for development
const DUMMY_PROTOTYPE = {
  id: 'proto-1',
  name: 'Homepage Redesign v2',
  url: 'https://example.vercel.app/',
  description: 'New homepage mockup with updated hero section and improved navigation',
  created_at: '2025-01-05T10:00:00Z'
};

const DUMMY_COMMENTS = [
  {
    id: 'comment-1',
    number: 1,
    x_percent: 25,
    y_percent: 40,
    author: 'Sarah Johnson',
    author_role: 'client_admin',
    text: 'Love the new hero section! The typography is much better than the previous version.',
    status: 'open',
    created_at: '2025-01-05T10:30:00Z',
    replies: [
      {
        id: 'reply-1',
        author: 'Mike Chen',
        author_role: 'team_member',
        text: 'Thank you! We spent extra time on the font pairing.',
        created_at: '2025-01-05T11:00:00Z'
      }
    ]
  },
  {
    id: 'comment-2',
    number: 2,
    x_percent: 60,
    y_percent: 25,
    author: 'John Davis',
    author_role: 'client_participant',
    text: 'The navigation menu feels a bit cramped on my screen. Could we add more spacing?',
    status: 'open',
    created_at: '2025-01-05T11:30:00Z',
    replies: []
  },
  {
    id: 'comment-3',
    number: 3,
    x_percent: 45,
    y_percent: 70,
    author: 'Emma Wilson',
    author_role: 'client_admin',
    text: 'This section looks perfect. Approved!',
    status: 'resolved',
    created_at: '2025-01-05T12:00:00Z',
    replies: []
  }
];

export default function PrototypeReviewPage({ params }) {
  // Get URL from query params
  const searchParams = useSearchParams();
  const urlFromQuery = searchParams.get('url');

  // Mode state: 'browsing' or 'commenting'
  const [mode, setMode] = useState('browsing');

  // Comments state
  const [comments, setComments] = useState(DUMMY_COMMENTS);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);

  // New comment placement
  const [pendingComment, setPendingComment] = useState(null);

  // Prototype data
  const [prototype, setPrototype] = useState(DUMMY_PROTOTYPE);
  const [isLoading, setIsLoading] = useState(false);

  // Iframe error handling
  const [iframeError, setIframeError] = useState(false);
  const [iframeErrorMessage, setIframeErrorMessage] = useState('');

  // Refs
  const iframeContainerRef = useRef(null);
  const iframeRef = useRef(null);

  // Update prototype URL from query params
  useEffect(() => {
    if (urlFromQuery) {
      setPrototype(prev => ({
        ...prev,
        url: urlFromQuery,
        name: 'Prototype Review',
        description: `Reviewing: ${urlFromQuery}`
      }));
    }
  }, [urlFromQuery]);

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
  const handleCommentSubmit = (text) => {
    if (!pendingComment || !text.trim()) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      number: pendingComment.number,
      x_percent: pendingComment.x_percent,
      y_percent: pendingComment.y_percent,
      author: 'Current User', // Would come from auth
      author_role: 'client_admin',
      text: text.trim(),
      status: 'open',
      created_at: new Date().toISOString(),
      replies: []
    };

    setComments([...comments, newComment]);
    setPendingComment(null);
    setActiveCommentId(newComment.id);
  };

  // Handle reply submission
  const handleReplySubmit = (commentId, text) => {
    if (!text.trim()) return;

    const newReply = {
      id: `reply-${Date.now()}`,
      author: 'Current User',
      author_role: 'team_member',
      text: text.trim(),
      created_at: new Date().toISOString()
    };

    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...comment.replies, newReply]
        };
      }
      return comment;
    }));
  };

  // Handle comment resolve
  const handleCommentResolve = (commentId) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          status: comment.status === 'open' ? 'resolved' : 'open'
        };
      }
      return comment;
    }));
  };

  // Handle comment delete
  const handleCommentDelete = (commentId) => {
    if (confirm('Delete this comment?')) {
      setComments(comments.filter(c => c.id !== commentId));
      if (activeCommentId === commentId) {
        setActiveCommentId(null);
      }
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
            onError={() => {
              console.error('Iframe onError triggered');
              setIframeError(true);
              setIframeErrorMessage('Failed to load the prototype. The site may block iframe embedding.');
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
                      setIframeError(true);
                      setIframeErrorMessage('This website blocks iframe embedding (X-Frame-Options or CSP headers).');
                      return;
                    }

                    // Check if iframe body is empty (CSP blocked but page loaded)
                    const bodyContent = iframeDoc.body?.innerHTML || '';
                    if (bodyContent.trim().length === 0) {
                      console.warn('Iframe loaded but body is empty - likely CSP blocked');
                      setIframeError(true);
                      setIframeErrorMessage('This website blocks iframe embedding (Content Security Policy).');
                      return;
                    }

                    // Success - iframe loaded properly
                    console.log('Iframe loaded successfully');
                    setIframeError(false);
                  }
                } catch (e) {
                  // CORS/CSP error when trying to access iframe
                  console.error('Iframe access error (CSP/CORS):', e);
                  setIframeError(true);
                  setIframeErrorMessage('This website blocks iframe embedding due to security policies (CSP/CORS).');
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
    </div>
  );
}
