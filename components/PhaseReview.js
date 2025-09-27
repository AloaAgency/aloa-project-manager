'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, X, AlertCircle, MessageSquare, ThumbsUp, ThumbsDown, Edit, Eye } from 'lucide-react';

export default function PhaseReview({
  applet,
  projectId,
  userId,
  isViewOnly = false,
  onClose,
  onComplete
}) {
  const [reviewData, setReviewData] = useState({});
  const [decision, setDecision] = useState(''); // 'approve', 'revise', ''
  const [feedback, setFeedback] = useState('');
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [previousResponse, setPreviousResponse] = useState(null);

  // Load previous response if exists
  useEffect(() => {
    if (applet.form_progress?.reviewData) {
      const progress = applet.form_progress.reviewData;
      setReviewData(progress);
      setDecision(progress.decision || '');
      setFeedback(progress.feedback || '');
      setCheckedItems(progress.checkedItems || {});
      setHasSubmitted(progress.hasSubmitted || false);
      setPreviousResponse(progress);
    }
  }, [applet]);

  // Initialize checklist items
  useEffect(() => {
    if (applet.config?.review_items && Object.keys(checkedItems).length === 0) {
      const initialChecks = {};
      applet.config.review_items.forEach((item, index) => {
        initialChecks[index] = false;
      });
      setCheckedItems(initialChecks);
    }
  }, [applet.config?.review_items]);

  const handleCheckItem = (index) => {
    if (isViewOnly || applet.config?.locked) return;
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSubmit = async () => {
    if (!decision) {
      alert('Please select whether to approve or request revisions');
      return;
    }

    if (decision === 'revise' && !feedback.trim()) {
      alert('Please provide feedback about what needs revision');
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        decision,
        feedback,
        checkedItems,
        timestamp: new Date().toISOString(),
        hasSubmitted: true,
        userId
      };

      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: decision === 'approve' ? 'completed' : 'in_progress',
          interactionType: 'phase_review_submission',
          userId,
          data: {
            form_progress: {
              reviewData: submissionData,
              userId
            }
          }
        })
      });

      if (response.ok) {
        setHasSubmitted(true);
        setPreviousResponse(submissionData);

        // If approved, trigger celebration
        if (decision === 'approve' && onComplete) {
          setTimeout(() => {
            onComplete();
          }, 500);
        } else {
          // If revision requested, just close
          setTimeout(() => {
            if (onClose) onClose();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error submitting phase review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remainingRevisions = applet.config?.remaining_revisions || 0;
  const maxRevisions = applet.config?.max_revisions || 2;
  const isLocked = applet.config?.locked || false;
  const heading = applet.config?.heading || 'Phase Review';
  const description = applet.config?.description || 'Please review the complete design and provide your feedback.';
  const reviewItems = applet.config?.review_items || [];
  const approvalRequired = applet.config?.approval_required !== false;

  // Calculate if all items are checked
  const allItemsChecked = Object.keys(checkedItems).length > 0 &&
    Object.values(checkedItems).every(checked => checked);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl ring-4 ring-orange-200 ring-opacity-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  {heading}
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">Major Milestone</span>
                </h2>
                <p className="text-white/95 text-base mt-1">{description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Revision Counter */}
          <div className="mt-4 bg-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Revisions Remaining:</span>
              <div className="flex items-center space-x-2">
                {[...Array(maxRevisions)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      i < remainingRevisions
                        ? 'bg-white text-slate-700'
                        : 'bg-white/20 text-white/50'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
            {remainingRevisions === 0 && (
              <p className="text-xs text-yellow-200 mt-2">
                ⚠️ No revisions remaining - final decision required
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* View/Edit Mode Indicator */}
          {(isLocked || isViewOnly) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-blue-700">
                View Only Mode - {hasSubmitted ? 'Your review has been submitted' : 'This phase is locked'}
              </span>
            </div>
          )}

          {/* Previous Response Display */}
          {hasSubmitted && previousResponse && (
            <div className={`mb-6 p-4 rounded-lg ${
              previousResponse.decision === 'approve'
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {previousResponse.decision === 'approve' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">Phase Approved</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-700">Revision Requested</span>
                  </>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(previousResponse.timestamp).toLocaleString()}
                </span>
              </div>
              {previousResponse.feedback && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Your Feedback:</p>
                  <p className="text-sm text-gray-600 mt-1">{previousResponse.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Review Checklist */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-slate-600" />
              Review Checklist
            </h3>
            <div className="space-y-3">
              {reviewItems.map((item, index) => (
                <label
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    checkedItems[index]
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200'
                  } ${(isLocked || isViewOnly) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-gray-100'}`}
                >
                  <input
                    type="checkbox"
                    checked={checkedItems[index] || false}
                    onChange={() => handleCheckItem(index)}
                    disabled={isLocked || isViewOnly}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                  </div>
                </label>
              ))}
            </div>
            {!allItemsChecked && !isViewOnly && !isLocked && (
              <p className="text-sm text-gray-500 mt-3">
                Please review all items before making a decision
              </p>
            )}
          </div>

          {/* Decision Section */}
          {!isViewOnly && !isLocked && !hasSubmitted && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Your Decision</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDecision('approve')}
                    disabled={!allItemsChecked}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      decision === 'approve'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!allItemsChecked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsUp className={`h-6 w-6 mb-2 mx-auto ${
                      decision === 'approve' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold">Approve Phase</div>
                    <div className="text-xs text-gray-600 mt-1">
                      I'm satisfied with the current design
                    </div>
                  </button>

                  <button
                    onClick={() => setDecision('revise')}
                    disabled={!allItemsChecked || remainingRevisions === 0}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      decision === 'revise'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${(!allItemsChecked || remainingRevisions === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Edit className={`h-6 w-6 mb-2 mx-auto ${
                      decision === 'revise' ? 'text-yellow-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold">Request Revision</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {remainingRevisions > 0
                        ? `I need changes (${remainingRevisions} left)`
                        : 'No revisions remaining'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">
                  <MessageSquare className="inline h-5 w-5 mr-2 text-slate-600" />
                  Feedback {decision === 'revise' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    decision === 'revise'
                      ? "Please describe what needs to be revised..."
                      : "Optional: Add any comments or praise for the team..."
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!decision || (decision === 'revise' && !feedback.trim()) || loading}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    decision === 'approve'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : decision === 'revise'
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Submitting...</span>
                    </div>
                  ) : decision === 'approve' ? (
                    'Approve Phase'
                  ) : decision === 'revise' ? (
                    'Request Revision'
                  ) : (
                    'Select Decision'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
