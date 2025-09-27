'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Save, Check, Minus, Eye, User, CheckCircle, AlertCircle, ThumbsUp, Edit } from 'lucide-react';
import dynamic from 'next/dynamic';

const PhaseReviewResponseViewer = dynamic(() => import('./PhaseReviewResponseViewer'), {
  loading: () => <div className="p-4">Loading...</div>
});

export default function PhaseReviewConfig({ applet, projectId, projectletId, onUpdate }) {
  // Local state for all fields
  const [heading, setHeading] = useState(applet.config?.heading || 'Phase Review');
  const [description, setDescription] = useState(applet.config?.description || 'We\'ve reached a major milestone! Please review the complete design and provide your feedback.');
  const [maxRevisions, setMaxRevisions] = useState(applet.config?.max_revisions || 2);
  const [remainingRevisions, setRemainingRevisions] = useState(applet.config?.remaining_revisions || applet.config?.max_revisions || 2);
  const [reviewItems, setReviewItems] = useState(applet.config?.review_items || [
    { title: 'Overall Design', description: 'Does the design meet your vision and requirements?' },
    { title: 'User Experience', description: 'Is the navigation and user flow intuitive?' },
    { title: 'Visual Appeal', description: 'Are you satisfied with the visual design and aesthetics?' },
    { title: 'Content', description: 'Is all the necessary content properly represented?' },
    { title: 'Functionality', description: 'Are all required features and functionalities included?' }
  ]);
  const [approvalRequired, setApprovalRequired] = useState(applet.config?.approval_required !== false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // State for response viewing
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  // Reset state when applet changes
  useEffect(() => {
    setHeading(applet.config?.heading || 'Phase Review');
    setDescription(applet.config?.description || 'We\'ve reached a major milestone! Please review the complete design and provide your feedback.');
    setMaxRevisions(applet.config?.max_revisions || 2);
    setRemainingRevisions(applet.config?.remaining_revisions || applet.config?.max_revisions || 2);
    setReviewItems(applet.config?.review_items || [
      { title: 'Overall Design', description: 'Does the design meet your vision and requirements?' },
      { title: 'User Experience', description: 'Is the navigation and user flow intuitive?' },
      { title: 'Visual Appeal', description: 'Are you satisfied with the visual design and aesthetics?' },
      { title: 'Content', description: 'Is all the necessary content properly represented?' },
      { title: 'Functionality', description: 'Are all required features and functionalities included?' }
    ]);
    setApprovalRequired(applet.config?.approval_required !== false);
    setHasChanges(false);
    setSaved(false);
  }, [applet.id]);

  // Fetch responses when component mounts or applet changes
  useEffect(() => {
    fetchResponses();
  }, [applet.id]);

  // Fetch phase review responses
  const fetchResponses = async () => {
    setLoadingResponses(true);
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets/${applet.id}/progress`);
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

  // Handle avatar click
  const handleAvatarClick = (response) => {
    setSelectedResponse(response.form_progress?.reviewData || response);
    setSelectedUserName(response.user_name || response.email || 'Unknown User');
  };

  // Handle heading change
  const handleHeadingChange = (e) => {
    setHeading(e.target.value);
    setHasChanges(true);
    setSaved(false);
  };

  // Handle description change
  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    setHasChanges(true);
    setSaved(false);
  };

  // Handle max revisions change
  const handleMaxRevisionsChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setMaxRevisions(value);
    // If remaining revisions is greater than max, adjust it
    if (remainingRevisions > value) {
      setRemainingRevisions(value);
    }
    setHasChanges(true);
    setSaved(false);
  };

  // Handle remaining revisions change
  const handleRemainingRevisionsChange = (value) => {
    const newValue = Math.max(0, Math.min(maxRevisions, value));
    setRemainingRevisions(newValue);
    setHasChanges(true);
    setSaved(false);
  };

  // Handle review item changes
  const handleReviewItemChange = (index, field, value) => {
    const updatedItems = [...reviewItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setReviewItems(updatedItems);
    setHasChanges(true);
    setSaved(false);
  };

  // Add new review item
  const handleAddReviewItem = () => {
    const updatedItems = [
      ...reviewItems,
      {
        title: 'New Review Area',
        description: 'Please provide feedback on this aspect'
      }
    ];
    setReviewItems(updatedItems);
    setHasChanges(true);
    setSaved(false);
  };

  // Delete review item
  const handleDeleteReviewItem = (index) => {
    const updatedItems = reviewItems.filter((_, i) => i !== index);
    setReviewItems(updatedItems);
    setHasChanges(true);
    setSaved(false);
  };

  // Handle approval required change
  const handleApprovalRequiredChange = (e) => {
    setApprovalRequired(e.target.checked);
    setHasChanges(true);
    setSaved(false);
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets/${applet.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              heading,
              description,
              max_revisions: maxRevisions,
              remaining_revisions: remainingRevisions,
              review_items: reviewItems,
              approval_required: approvalRequired,
              locked: applet.config?.locked || false
            }
          })
        }
      );

      if (response.ok) {
        setSaved(true);
        setHasChanges(false);
        if (onUpdate) {
          onUpdate();
        }
        // Reset saved indicator after 2 seconds
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
      {/* Heading */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phase Title
        </label>
        <input
          type="text"
          value={heading}
          onChange={handleHeadingChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phase Description
        </label>
        <textarea
          value={description}
          onChange={handleDescriptionChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Revision Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Revisions
          </label>
          <input
            type="number"
            min="0"
            max="10"
            value={maxRevisions}
            onChange={handleMaxRevisionsChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remaining Revisions
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRemainingRevisionsChange(remainingRevisions - 1)}
              disabled={remainingRevisions <= 0}
              className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 py-2 bg-white border rounded-lg font-semibold text-center min-w-[60px]">
              {remainingRevisions}
            </span>
            <button
              onClick={() => handleRemainingRevisionsChange(remainingRevisions + 1)}
              disabled={remainingRevisions >= maxRevisions}
              className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Decrease when client requests a revision
          </p>
        </div>
      </div>

      {/* Review Items */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Review Checklist Items
          </label>
          <button
            onClick={handleAddReviewItem}
            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
        <div className="space-y-3">
          {reviewItems.map((item, index) => (
            <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleReviewItemChange(index, 'title', e.target.value)}
                    placeholder="Review area title"
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleReviewItemChange(index, 'description', e.target.value)}
                    placeholder="Description or guidance"
                    className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <button
                  onClick={() => handleDeleteReviewItem(index)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Required */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
        <input
          type="checkbox"
          id="approval-required"
          checked={approvalRequired}
          onChange={handleApprovalRequiredChange}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="approval-required" className="text-sm text-gray-700">
          Require formal approval to complete phase
        </label>
      </div>

      {/* Client Responses Section */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <User className="h-4 w-4" />
            Client Responses
          </h3>
          {responses.length > 0 && (
            <button
              onClick={fetchResponses}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          )}
        </div>

        {loadingResponses ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : responses.length > 0 ? (
          <div className="flex flex-wrap gap-3">
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
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white transition-all group-hover:scale-110 ${
                    decision === 'approve'
                      ? 'bg-green-500 ring-2 ring-green-300'
                      : decision === 'revise'
                      ? 'bg-yellow-500 ring-2 ring-yellow-300'
                      : 'bg-gray-400 ring-2 ring-gray-300'
                  }`}>
                    {initials}
                  </div>

                  {/* Status Icon */}
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow-sm ${
                    decision === 'approve'
                      ? 'text-green-500'
                      : decision === 'revise'
                      ? 'text-yellow-500'
                      : 'text-gray-400'
                  }`}>
                    {decision === 'approve' ? (
                      <ThumbsUp className="h-3 w-3" />
                    ) : decision === 'revise' ? (
                      <Edit className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                  </div>

                  {/* Hover Label */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {userName.split(' ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
            No client responses yet
          </div>
        )}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
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