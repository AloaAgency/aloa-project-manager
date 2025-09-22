'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Edit3,
  Eye,
  X,
  Sparkles,
  PartyPopper
} from 'lucide-react';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientReview({
  applet,
  isViewOnly,
  onClose,
  onComplete,
  projectId,
  userId,
  userRole
}) {
  const [reviewData, setReviewData] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBigConfetti, setShowBigConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Only Client Admins can interact with this applet
  const canInteract = userRole === 'client_admin' && !isViewOnly;

  useEffect(() => {
    // Set window size for confetti
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    // Load existing review data
    if (applet.form_progress) {
      setReviewData(applet.form_progress);
      if (applet.form_progress.revision_notes) {
        setRevisionNotes(applet.form_progress.revision_notes);
      }
    }
  }, [applet]);

  const handleApprove = async () => {
    if (!canInteract) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: 'completed',
          interactionType: 'client_review_approval',
          userId,
          data: {
            form_progress: {
              status: 'approved',
              approved_at: new Date().toISOString(),
              reviewed_by: userId,
              revision_notes: null,
              revision_count: reviewData?.revision_count || 0
            }
          }
        })
      });

      if (response.ok) {
        // Show big confetti celebration for approval
        setShowBigConfetti(true);

        // Play success sound if available
        const audio = new Audio('/sounds/success.mp3');
        audio.play().catch(() => {}); // Ignore if sound fails

        setTimeout(() => {
          setShowBigConfetti(false);
          if (onComplete) {
            onComplete();
          }
        }, 5000); // Longer celebration for approval
      }
    } catch (error) {
      console.error('Error approving review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!canInteract) return;

    if (!revisionNotes.trim()) {
      alert('Please provide specific revision notes');
      return;
    }

    const currentRevisionCount = (reviewData?.revision_count || 0) + 1;
    const maxRevisions = applet.config?.max_revisions || 2;

    if (currentRevisionCount > maxRevisions) {
      if (!confirm(`You have already requested ${maxRevisions} revisions. Your contract includes up to ${maxRevisions} revision requests. Do you want to continue? Additional revisions may incur extra charges.`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: 'completed', // Changed from 'in_progress' - client has made a decision
          interactionType: 'client_review_revision',
          userId,
          data: {
            form_progress: {
              status: 'revision_requested',
              revision_requested_at: new Date().toISOString(),
              reviewed_by: userId,
              revision_notes: revisionNotes,
              revision_count: currentRevisionCount,
              approved_at: null
            }
          }
        })
      });

      if (response.ok) {
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not a Client Admin, show a message
  if (userRole !== 'client_admin') {
    return (
      <div className="bg-white rounded-lg p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Client Admin Access Required
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Only Client Admins can approve work or request revisions. Please contact your Client Admin to review this item.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Big confetti for approval */}
      {showBigConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={500}
            recycle={false}
            colors={['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32', '#FF1493']}
          />
          <motion.div
            className="fixed inset-0 flex items-center justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-12 py-8 rounded-3xl shadow-2xl">
              <div className="text-center">
                <PartyPopper className="w-20 h-20 mx-auto mb-4" />
                <h2 className="text-4xl font-bold mb-2">Work Approved!</h2>
                <p className="text-xl">You're one step closer towards completing this project!</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-lg relative">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {applet.config?.header || 'Review & Approve'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {applet.config?.description || 'Please review the work above and let us know if it meets your requirements.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          {reviewData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-medium text-sm text-gray-700 mb-2">Current Status</div>
              {reviewData.status === 'approved' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Approved</span>
                  {reviewData.approved_at && (
                    <span className="text-sm text-gray-500">
                      on {new Date(reviewData.approved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : reviewData.status === 'revision_requested' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Revision Requested</span>
                  </div>
                  {reviewData.revision_notes && (
                    <div className="bg-orange-50 p-3 rounded text-sm">
                      <strong>Your Notes:</strong> {reviewData.revision_notes}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">
                    Revision {reviewData.revision_count} of {applet.config?.max_revisions || 2}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">
                  Not yet reviewed
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Only show if not locked and user can interact */}
          {canInteract && reviewData?.status !== 'approved' && (
            <div className="space-y-4">
              {/* Approval Button */}
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve This Work
              </button>

              {/* Request Revision Section */}
              <div className="border-t pt-4">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Request Revisions
                  </label>
                  <textarea
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Please be specific about what changes you'd like to see..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={4}
                    disabled={isSubmitting}
                  />
                  <button
                    onClick={handleRequestRevision}
                    disabled={isSubmitting || !revisionNotes.trim()}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-5 h-5" />
                    Request Revisions
                  </button>
                </div>
              </div>

              {/* Contract Notice */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800">
                <strong>Please note:</strong> Your contract includes up to {applet.config?.max_revisions || 2} revision requests per step.
                {reviewData?.revision_count > 0 && (
                  <span> You have used {reviewData.revision_count} revision{reviewData.revision_count !== 1 ? 's' : ''}.</span>
                )}
              </div>
            </div>
          )}

          {/* View-only message */}
          {isViewOnly && (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                This review is locked and cannot be modified.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}