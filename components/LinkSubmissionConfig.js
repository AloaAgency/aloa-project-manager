'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Save, Check } from 'lucide-react';

export default function LinkSubmissionConfig({ applet, projectId, projectletId, onUpdate }) {
  // Local state for all fields
  const [heading, setHeading] = useState(applet.config?.heading || 'Project Deliverables');
  const [description, setDescription] = useState(applet.config?.description || 'Please review the following materials:');
  const [links, setLinks] = useState(applet.config?.links || []);
  const [allowAcknowledgment, setAllowAcknowledgment] = useState(applet.config?.allow_client_acknowledgment !== false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reset state when applet changes
  useEffect(() => {
    setHeading(applet.config?.heading || 'Project Deliverables');
    setDescription(applet.config?.description || 'Please review the following materials:');
    setLinks(applet.config?.links || []);
    setAllowAcknowledgment(applet.config?.allow_client_acknowledgment !== false);
    setHasChanges(false);
    setSaved(false);
  }, [applet.id]);

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

  // Handle link changes
  const handleLinkChange = (index, field, value) => {
    const updatedLinks = [...links];
    updatedLinks[index] = {
      ...updatedLinks[index],
      [field]: value
    };
    setLinks(updatedLinks);
    setHasChanges(true);
    setSaved(false);
  };

  // Add new link
  const handleAddLink = () => {
    const updatedLinks = [
      ...links,
      {
        text: 'New Link',
        url: 'https://example.com',
        description: ''
      }
    ];
    setLinks(updatedLinks);
    setHasChanges(true);
    setSaved(false);
  };

  // Delete link
  const handleDeleteLink = (index) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    setLinks(updatedLinks);
    setHasChanges(true);
    setSaved(false);
  };

  // Handle acknowledgment change
  const handleAcknowledgmentChange = (e) => {
    setAllowAcknowledgment(e.target.checked);
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
              links,
              allow_client_acknowledgment: allowAcknowledgment
            }
          })
        }
      );
      if (response.ok) {
        setHasChanges(false);
        setSaved(true);
        if (onUpdate) {
          onUpdate();
        }
        // Show saved state for 2 seconds
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {

    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
      {/* Heading field */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={heading}
          onChange={handleHeadingChange}
          className="w-full text-sm px-2 py-1 border rounded bg-white"
          placeholder="Enter heading text"
        />
      </div>

      {/* Description field */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={handleDescriptionChange}
          className="w-full text-sm px-2 py-1 border rounded bg-white"
          rows="2"
          placeholder="Enter description text"
        />
      </div>

      {/* Links management */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Links
        </label>
        <div className="space-y-2">
          {links.map((link, linkIndex) => (
            <div key={linkIndex} className="p-2 bg-white border rounded space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={link.text || ''}
                  onChange={(e) => handleLinkChange(linkIndex, 'text', e.target.value)}
                  className="flex-1 text-sm px-2 py-1 border rounded"
                  placeholder="Link text"
                />
                <button
                  onClick={() => handleDeleteLink(linkIndex)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Delete link"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="url"
                value={link.url || ''}
                onChange={(e) => handleLinkChange(linkIndex, 'url', e.target.value)}
                className="w-full text-sm px-2 py-1 border rounded"
                placeholder="https://example.com"
              />
              <input
                type="text"
                value={link.description || ''}
                onChange={(e) => handleLinkChange(linkIndex, 'description', e.target.value)}
                className="w-full text-sm px-2 py-1 border rounded"
                placeholder="Brief description (optional)"
              />
            </div>
          ))}

          {/* Add new link button */}
          <button
            onClick={handleAddLink}
            className="w-full py-1 px-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>
      </div>

      {/* Client acknowledgment checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`ack-${applet.id}`}
          checked={allowAcknowledgment}
          onChange={handleAcknowledgmentChange}
          className="rounded"
        />
        <label htmlFor={`ack-${applet.id}`} className="text-xs text-gray-700">
          Allow client acknowledgment
        </label>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-gray-600">
          {hasChanges && !saved && (
            <span className="text-amber-600">• Unsaved changes</span>
          )}
          {saved && (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
            hasChanges && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}