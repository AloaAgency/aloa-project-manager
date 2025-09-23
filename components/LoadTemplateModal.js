'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Search, Download, Globe, Lock, Trash2, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoadTemplateModal({
  isOpen,
  onClose,
  projectId,
  onLoadTemplate
}) {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [applying, setApplying] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchCurrentUser();
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen && !applying && !deletingTemplate) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose, applying, deletingTemplate]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.profile?.id);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projectlet-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/apply-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply template');
      }

      const result = await response.json();
      toast.success(`Template "${selectedTemplate.name}" applied successfully!`);

      // Close modal first
      onClose();

      // Then trigger refresh callback
      if (onLoadTemplate) {
        setTimeout(() => {
          onLoadTemplate(result);
        }, 100);
      } else {
        // If no callback provided, reload the page as fallback
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingTemplate(template.id);
    try {
      const response = await fetch(`/api/projectlet-templates?id=${template.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      toast.success(`Template "${template.name}" deleted successfully`);
      fetchTemplates(); // Refresh the list
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingTemplate(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{isManageMode ? 'Manage Templates' : 'Load Template'}</h2>
              <button
                onClick={() => setIsManageMode(!isManageMode)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title={isManageMode ? 'Back to Load' : 'Manage Templates'}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="page">Page Templates</option>
              <option value="form">Form Collections</option>
              <option value="review">Review Processes</option>
              <option value="complete">Complete Projects</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Templates List */}
          <div className="overflow-y-auto max-h-[400px] space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No templates found</p>
              </div>
            ) : (
              filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => !isManageMode && setSelectedTemplate(template)}
                  className={`p-4 border rounded-lg ${
                    isManageMode
                      ? 'cursor-default'
                      : `cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'hover:border-gray-300 hover:bg-gray-50'
                        }`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.is_public ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {template.category}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {template.template_data?.type === 'single'
                            ? '1 projectlet'
                            : `${template.template_data?.projectlets?.length || 0} projectlets`}
                        </span>
                        <span>
                          Created {new Date(template.created_at).toLocaleDateString()}
                        </span>
                        {template.created_by_name && (
                          <span>by {template.created_by_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isManageMode && selectedTemplate?.id === template.id && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}

                      {/* Delete button for manage mode */}
                      {isManageMode && template.created_by === currentUserId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template);
                          }}
                          disabled={deletingTemplate === template.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Delete template"
                        >
                          {deletingTemplate === template.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Template Preview */}
                  {!isManageMode && selectedTemplate?.id === template.id && template.template_data && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Template Contents:</h4>
                      {template.template_data.type === 'single' ? (
                        <div className="text-xs text-gray-600">
                          <div className="mb-1">
                            • <strong>{template.template_data.projectlet?.name || 'Projectlet'}</strong>
                          </div>
                          {template.template_data.applets?.length > 0 && (
                            <div className="ml-4">
                              {template.template_data.applets.map((applet, idx) => (
                                <div key={idx}>- {applet.name} ({applet.type})</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                          {template.template_data.projectlets?.map((projectlet, idx) => (
                            <div key={idx} className="mb-2">
                              • <strong>{projectlet.name}</strong>
                              {projectlet.applets?.length > 0 && (
                                <span className="ml-2 text-gray-400">
                                  ({projectlet.applets.length} applets)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {isManageMode && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p>You can manage and delete your own templates here. Public templates can be used by all team members.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={applying}
          >
            Cancel
          </button>
          {!isManageMode && (
            <button
              onClick={handleApplyTemplate}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center disabled:opacity-50"
              disabled={applying || !selectedTemplate}
            >
              {applying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Applying...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Apply Template
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}