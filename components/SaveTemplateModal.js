'use client';

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SaveTemplateModal({
  isOpen,
  onClose,
  projectId,
  selectedProjectlet,
  allProjectlets,
  projectletApplets
}) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('page');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setSaving(true);

    try {
      // Prepare template data
      let templateData;

      if (selectedProjectlet) {
        // Save single projectlet as template
        const applets = projectletApplets[selectedProjectlet.id] || [];
        templateData = {
          type: 'single',
          projectlet: {
            name: selectedProjectlet.name,
            description: selectedProjectlet.description,
            status: selectedProjectlet.status,
            type: selectedProjectlet.type || 'design',
            color: selectedProjectlet.color || selectedProjectlet.metadata?.color,
            order_index: 0
          },
          applets: applets.map(applet => ({
            type: applet.type,
            name: applet.name,
            config: applet.config,
            is_locked: applet.config?.locked || false,
            order_index: applet.order_index
          }))
        };
      } else {
        // Save all projectlets as template
        templateData = {
          type: 'collection',
          projectlets: allProjectlets.map((projectlet, index) => {
            const applets = projectletApplets[projectlet.id] || [];
            return {
              name: projectlet.name,
              description: projectlet.description,
              status: projectlet.status,
              type: projectlet.type || 'design',
              color: projectlet.color || projectlet.metadata?.color,
              order_index: index,
              applets: applets.map(applet => ({
                type: applet.type,
                name: applet.name,
                config: applet.config,
                is_locked: applet.config?.locked || false,
                order_index: applet.order_index
              }))
            };
          })
        };
      }

      const response = await fetch('/api/projectlet-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          template_data: templateData,
          category: templateCategory,
          is_public: isPublic
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast.success('Template saved successfully!');
      onClose();

      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('page');
      setIsPublic(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              Save {selectedProjectlet ? `"${selectedProjectlet.name}"` : 'All Projectlets'} as Template
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Homepage with Review Flow"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Describe what this template includes and when to use it..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="page">Page Template</option>
              <option value="form">Form Collection</option>
              <option value="review">Review Process</option>
              <option value="complete">Complete Project</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">
                Make this template public (available to all projects)
              </span>
            </label>
          </div>

          {selectedProjectlet && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              This will save the projectlet "{selectedProjectlet.name}" with {projectletApplets[selectedProjectlet.id]?.length || 0} applet(s) as a reusable template.
            </div>
          )}

          {!selectedProjectlet && allProjectlets && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              This will save all {allProjectlets.length} projectlet(s) with their applets as a complete template.
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center disabled:opacity-50"
            disabled={saving || !templateName.trim()}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}