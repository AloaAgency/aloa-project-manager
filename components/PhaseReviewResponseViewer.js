'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ThumbsUp, Edit, User, Calendar } from 'lucide-react';

export default function PhaseReviewResponseViewer({ response, userName, onClose }) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  if (!response) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">No Response Data</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600">This user hasn't submitted a phase review yet.</p>
        </div>
      </div>
    );
  }

  const reviewData = response.form_progress?.reviewData || response;
  const { decision, feedback, checkedItems, timestamp } = reviewData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 rounded-t-xl ${
          decision === 'approve'
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-yellow-500 to-orange-500'
        } text-white`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Phase Review Response</h2>
              <div className="flex items-center space-x-4 text-white/90">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{userName || 'Unknown User'}</span>
                </div>
                {timestamp && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Decision */}
          <div className={`mb-6 p-4 rounded-lg ${
            decision === 'approve'
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              {decision === 'approve' ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="font-semibold text-green-700 text-lg">Phase Approved</span>
                </>
              ) : (
                <>
                  <Edit className="h-6 w-6 text-yellow-600" />
                  <span className="font-semibold text-yellow-700 text-lg">Revision Requested</span>
                </>
              )}
            </div>
          </div>

          {/* Checklist Items */}
          {checkedItems && Object.keys(checkedItems).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-700">Review Checklist</h3>
              <div className="space-y-2">
                {Object.entries(checkedItems).map(([index, checked]) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      checked
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${checked ? 'text-gray-700' : 'text-gray-400'}`}>
                      Item {parseInt(index) + 1} {checked ? 'reviewed' : 'not reviewed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-gray-700">Client Feedback</h3>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{feedback}</p>
              </div>
            </div>
          )}

          {!feedback && decision === 'approve' && (
            <div className="text-center py-4">
              <ThumbsUp className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">Client approved without additional comments</p>
            </div>
          )}

          {!feedback && decision === 'revise' && (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <p className="text-gray-600">Revision requested but no specific feedback provided</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}