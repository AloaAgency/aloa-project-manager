'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, Edit, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const PhaseReviewResponseViewer = dynamic(() => import('./PhaseReviewResponseViewer'), {
  loading: () => <div className="p-4">Loading...</div>
});

export default function PhaseReviewInlineDisplay({ applet, projectId, projectletId }) {
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  useEffect(() => {
    // First check if we have completions data on the applet (this is what shows the avatars)
    if (applet.completions && applet.completions.length > 0) {
      // Use the completions data directly - this is what populates the avatar display
      const phaseReviewResponses = applet.completions.map(completion => ({
        id: completion.id || completion.user_id,
        user_name: completion.user?.full_name || completion.user?.email || 'Unknown User',
        email: completion.user?.email,
        form_progress: completion.form_progress || completion.data || {}
      }));
      setResponses(phaseReviewResponses);
      setLoadingResponses(false);
    } else {
      // Fallback to fetching from API if completions not available
      const fetchResponses = async () => {
        setLoadingResponses(true);
        try {
          const response = await fetch(
            `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets/${applet.id}/progress`
          );
          if (response.ok) {
            const data = await response.json();
            // Filter for responses that have reviewData
            const phaseReviewResponses = data.filter(item =>
              item.form_progress?.reviewData &&
              (item.form_progress.reviewData.decision || item.form_progress.reviewData.feedback)
            );
            setResponses(phaseReviewResponses);
          }
        } catch (error) {
          console.error('Error fetching responses:', error);
        } finally {
          setLoadingResponses(false);
        }
      };
      fetchResponses();
    }
  }, [applet.id, applet.completions, projectId, projectletId]);

  const handleAvatarClick = (response) => {
    setSelectedResponse(response.form_progress?.reviewData || response);
    setSelectedUserName(response.user_name || response.email || 'Unknown User');
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs text-gray-600">
        <strong>{applet.config?.heading || 'Phase Review'}</strong> - {applet.config?.max_revisions || 2} revisions allowed, {applet.config?.remaining_revisions || 0} remaining
      </div>

      {/* Client Response Avatars */}
      {loadingResponses ? (
        <div className="text-xs text-gray-500">Loading responses...</div>
      ) : responses.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Client responses:</span>
          <div className="flex flex-wrap gap-2">
            {responses.map((response, index) => {
              const reviewData = response.form_progress?.reviewData;
              const decision = reviewData?.decision;
              const userName = response.user_name || response.email || 'User ' + (index + 1);
              const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <button
                  key={response.id || index}
                  onClick={() => handleAvatarClick(response)}
                  className="relative group"
                  title={`Click to view ${userName}'s response`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white transition-all group-hover:scale-110 ${
                    decision === 'approve'
                      ? 'bg-green-500 ring-1 ring-green-300'
                      : decision === 'revise'
                      ? 'bg-yellow-500 ring-1 ring-yellow-300'
                      : 'bg-gray-400 ring-1 ring-gray-300'
                  }`}>
                    {initials}
                  </div>

                  {/* Status Icon */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-white shadow-sm ${
                    decision === 'approve'
                      ? 'text-green-500'
                      : decision === 'revise'
                      ? 'text-yellow-500'
                      : 'text-gray-400'
                  }`}>
                    {decision === 'approve' ? (
                      <ThumbsUp className="h-2 w-2" />
                    ) : decision === 'revise' ? (
                      <Edit className="h-2 w-2" />
                    ) : (
                      <AlertCircle className="h-2 w-2" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-500">No client responses yet</div>
      )}

      {/* Response Viewer Modal */}
      {selectedResponse && (
        <PhaseReviewResponseViewer
          response={selectedResponse}
          userName={selectedUserName}
          onClose={() => {
            setSelectedResponse(null);
            setSelectedUserName('');
          }}
        />
      )}
    </div>
  );
}