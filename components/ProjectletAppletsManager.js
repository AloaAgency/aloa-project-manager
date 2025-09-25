'use client';

/**
 * ProjectletAppletsManager - Admin Interface for Applet Configuration
 * 
 * This component handles the ADMIN SIDE of applets - how administrators
 * set up and configure applets within projectlets.
 * 
 * Each applet has two sides:
 * 1. Admin Side (this component): Configuration, setup, management
 * 2. Client Side (separate component): Interactive experience for clients
 * 
 * Applet Types and Their Dual Nature:
 * - Form: Admin creates/selects form → Client fills out form
 * - Upload: Admin configures requirements → Client uploads files
 * - Review: Admin sets review criteria → Client reviews and approves
 * - Signoff: Admin defines approval needs → Client provides signature
 * - Moodboard: Admin sets parameters → Client selects preferences
 * - Content Gather: Admin defines fields → Client provides content
 * 
 * The configuration done here directly determines what clients see
 * and need to complete in their project journey.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from '../lib/debounce';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Eye,
  Upload,
  CheckCircle,
  Palette,
  MessageSquare,
  Gamepad2,
  Link,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  X,
  Bot,
  ExternalLink,
  BarChart,
  Edit2,
  Type,
  FileUp,
  Brain,
  Video
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamic import for AI form builder to avoid SSR issues
const AIChatFormBuilder = dynamic(() => import('@/components/AIChatFormBuilder'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  )
});

const APPLET_ICONS = {
  form: FileText,
  review: Eye,
  upload: Upload,
  signoff: CheckCircle,
  moodboard: Palette,
  sitemap_builder: Gamepad2,
  content_gather: MessageSquare,
  feedback_loop: MessageSquare,
  link_submission: Link,
  palette_cleanser: Palette,
  tone_of_voice: Type,
  client_review: CheckCircle,
  ai_form_results: Brain,
  ai_narrative_generator: Edit2,
  video: Video
};

const APPLET_COLORS = {
  form: 'bg-blue-100 text-blue-700 border-blue-300',
  review: 'bg-purple-100 text-purple-700 border-purple-300',
  upload: 'bg-green-100 text-green-700 border-green-300',
  signoff: 'bg-red-100 text-red-700 border-red-300',
  moodboard: 'bg-pink-100 text-pink-700 border-pink-300',
  sitemap_builder: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  content_gather: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  feedback_loop: 'bg-orange-100 text-orange-700 border-orange-300',
  link_submission: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  palette_cleanser: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-300',
  tone_of_voice: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-300',
  client_review: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-300',
  ai_form_results: 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-300',
  ai_narrative_generator: 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-300',
  video: 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border-rose-300'
};

function ProjectletAppletsManager({ 
  projectId, 
  projectletId, 
  projectletName,
  availableForms = [],
  startWithLibraryOpen = false,
  onAppletsUpdated
}) {
  const router = useRouter();
  const [applets, setApplets] = useState([]);
  const [libraryApplets, setLibraryApplets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddApplet, setShowAddApplet] = useState(startWithLibraryOpen);
  const [selectedLibraryApplet, setSelectedLibraryApplet] = useState(null);
  const [expandedApplet, setExpandedApplet] = useState(null);
  const [editingApplet, setEditingApplet] = useState(null);
  const [showFormConfig, setShowFormConfig] = useState(false);
  const [formConfigMode, setFormConfigMode] = useState('select'); // 'select' or 'create'
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [creatingForm, setCreatingForm] = useState(false);
  const [showAIFormBuilder, setShowAIFormBuilder] = useState(false);
  const [projectKnowledge, setProjectKnowledge] = useState(null);
  const [uploadingMarkdown, setUploadingMarkdown] = useState(false);
  const [draggedApplet, setDraggedApplet] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    fetchApplets();
    fetchLibraryApplets();
  }, [projectletId]);

  const fetchApplets = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`
      );
      const data = await response.json();

      setApplets(data.applets || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, [projectId, projectletId]);

  const fetchLibraryApplets = useCallback(async () => {
    try {
      const response = await fetch('/api/aloa-applets/library?active=true');
      const data = await response.json();
      setLibraryApplets(data.applets || []);
    } catch (error) {

    }
  }, []);

  const addAppletFromLibrary = useCallback(async (libraryApplet) => {
    // Add all applets directly, including form applets with null form_id for inline configuration
    try {

      const appletData = {
        library_applet_id: libraryApplet.id,
        name: libraryApplet.name,
        description: libraryApplet.description,
        type: libraryApplet.type,
        config: libraryApplet.default_config || {},
        requires_approval: libraryApplet.requires_approval,
        client_instructions: libraryApplet.client_instructions,
        form_id: null // Always initialize form_id to null, not undefined
      };

      // For form applets, ensure form_id is null so it can be configured inline
      if (libraryApplet.type === 'form') {
        appletData.config = {
          form_id: null,
          required: true
        };
        appletData.form_id = null; // Also set the direct form_id field
      }

      // For client_review applets, ensure form_id is null (they don't use forms)
      if (libraryApplet.type === 'client_review') {
        appletData.form_id = null; // Client review doesn't need a form
        // Use the default config from the library
        appletData.config = libraryApplet.default_config || {
          header: 'Review & Approve',
          description: 'Please review the work above and let us know if it meets your requirements.',
          locked: false,
          max_revisions: 2
        };
      }

      // For link_submission applets, ensure proper initial config
      if (libraryApplet.type === 'link_submission') {
        appletData.config = {
          heading: libraryApplet.default_config?.heading || 'Project Deliverables',
          description: libraryApplet.default_config?.description || 'Please review the following materials:',
          links: libraryApplet.default_config?.links || [{
            text: 'View Link',
            url: 'https://example.com',
            description: 'Link description'
          }],
          allow_client_acknowledgment: libraryApplet.default_config?.allow_client_acknowledgment !== false
        };
      }

      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appletData)
        }
      );

      if (response.ok) {
        const createdApplet = await response.json();

        toast.success('Applet added successfully');
        fetchApplets();
        setShowAddApplet(false);
        setSelectedLibraryApplet(null);
        // Call the callback if provided (for parent component to refresh)
        if (onAppletsUpdated) {
          onAppletsUpdated();
        }
      }
    } catch (error) {

      toast.error('Failed to add applet');
    }
  }, [projectId, projectletId, onAppletsUpdated, fetchApplets]);

  const createFormWithAI = useCallback(async () => {
    setCreatingForm(true);
    try {
      // Get project knowledge context
      const knowledgeResponse = await fetch(`/api/aloa-projects/${projectId}/knowledge`);
      const knowledgeData = await knowledgeResponse.json();
      setProjectKnowledge(knowledgeData);

      // Show AI form builder modal instead of opening new window
      setShowFormConfig(false);
      setShowAIFormBuilder(true);
    } catch (error) {

      // Show modal anyway, just without project context
      setShowFormConfig(false);
      setShowAIFormBuilder(true);
    } finally {
      setCreatingForm(false);
    }
  }, [projectId]);

  const handleMarkdownUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.md')) {
      toast.error('Please upload a markdown file (.md)');
      return;
    }

    setUploadingMarkdown(true);
    try {
      const content = await file.text();

      // Create form from markdown
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: content,
          project_id: projectId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create form');
      }

      const createdForm = await response.json();
      toast.success('Form created from markdown successfully');

      // Attach the created form to the applet
      setSelectedFormId(createdForm.id);

      // Auto-attach the form to the applet if we have one selected
      if (selectedLibraryApplet) {
        await attachFormToApplet(selectedLibraryApplet, createdForm.id);
      } else {
        // Close the modal
        setShowFormConfig(false);
        // Refresh forms list
        if (onAppletsUpdated) {
          onAppletsUpdated();
        }
      }
    } catch (error) {

      toast.error(error.message || 'Failed to upload markdown file');
    } finally {
      setUploadingMarkdown(false);
      // Reset file input
      event.target.value = '';
    }
  }, [projectId, selectedLibraryApplet, onAppletsUpdated]);

  const attachFormToApplet = useCallback(async (applet, formId) => {
    try {
      // Check if this is an existing applet (has an id field) or a library applet
      if (applet.id && !applet.library_applet_id) {
        // This is an existing applet, update it
        await updateApplet(applet.id, {
          form_id: formId,
          config: { ...applet.config, form_id: formId }
        });
        toast.success('Form attached to applet successfully');
        fetchApplets();
        setShowFormConfig(false);
        setSelectedLibraryApplet(null);
      } else {
        // This is a new applet from library
        const appletData = {
          library_applet_id: applet.id,
          name: applet.name,
          description: applet.description,
          type: applet.type,
          config: { form_id: formId, required: true },
          form_id: formId,
          requires_approval: applet.requires_approval,
          client_instructions: applet.client_instructions
        };

        const response = await fetch(
          `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appletData)
          }
        );

        if (response.ok) {
          toast.success('Form attached to applet successfully');
          fetchApplets();
          setShowFormConfig(false);
          setSelectedLibraryApplet(null);
        } else {
          throw new Error('Failed to attach form to applet');
        }
      }
    } catch (error) {

      toast.error('Failed to attach form to applet');
    }
  }, [projectId, projectletId, fetchApplets]);

  const handleAIFormGenerated = useCallback(async (markdown) => {
    try {
      // Create form from AI-generated markdown
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const file = new File([blob], 'ai-generated-form.md', { type: 'text/markdown' });

      const formData = new FormData();
      formData.append('markdown', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/aloa-forms/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create form');
      }

      // Attach the form to the projectlet as an applet
      if (data.id && selectedLibraryApplet) {
        const appletResponse = await fetch(
          `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              library_applet_id: selectedLibraryApplet.id,
              name: data.title || 'AI Generated Form',
              description: selectedLibraryApplet.description,
              type: 'form',
              form_id: data.id,
              config: {
                formTitle: data.title,
                formId: data.id
              },
              requires_approval: selectedLibraryApplet.requires_approval,
              client_instructions: selectedLibraryApplet.client_instructions
            })
          }
        );

        if (appletResponse.ok) {
          toast.success('Form created and attached to projectlet!');
          fetchApplets();
        }
      }

      setShowAIFormBuilder(false);
      setSelectedLibraryApplet(null);
    } catch (error) {

      toast.error(error.message || 'Failed to create form');
    }
  }, [projectId, projectletId, selectedLibraryApplet, fetchApplets]);

  const attachExistingForm = useCallback(async () => {
    if (!selectedFormId) {
      toast.error('Please select a form');
      return;
    }

    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            library_applet_id: selectedLibraryApplet?.id,
            name: selectedLibraryApplet?.name || 'Form',
            description: selectedLibraryApplet?.description || 'Form submission',
            type: 'form',
            form_id: selectedFormId,
            config: { form_id: selectedFormId },
            requires_approval: false,
            client_instructions: 'Please complete this form'
          })
        }
      );

      if (response.ok) {
        await fetchApplets();
        setShowFormConfig(false);
        setSelectedFormId(null);
        setFormConfigMode('select');
        toast.success('Form attached successfully');
      }
    } catch (error) {

      toast.error('Failed to attach form');
    }
  }, [projectId, projectletId, selectedFormId, selectedLibraryApplet, fetchApplets]);

  const updateApplet = useCallback(async (appletId, updates) => {
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appletId,
            ...updates
          })
        }
      );

      if (response.ok) {
        toast.success('Applet updated');
        fetchApplets();
        setEditingApplet(null);
      }
    } catch (error) {

      toast.error('Failed to update applet');
    }
  }, [projectId, projectletId, fetchApplets]);

  // Debounced version for text inputs to prevent excessive API calls
  const debouncedUpdateApplet = useMemo(
    () => debounce(updateApplet, 500),
    [updateApplet]
  );

  const updateAppletStatus = useCallback(async (appletId, status) => {
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appletId, status })
        }
      );

      if (response.ok) {
        toast.success('Status updated');
        fetchApplets();
      }
    } catch (error) {

      toast.error('Failed to update status');
    }
  }, [projectId, projectletId, fetchApplets]);

  const deleteApplet = useCallback(async (appletId) => {
    if (!confirm('Are you sure you want to delete this applet?')) return;

    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets?appletId=${appletId}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok) {
        toast.success('Applet deleted');
        fetchApplets();
      }
    } catch (error) {

      toast.error('Failed to delete applet');
    }
  }, [projectId, projectletId, fetchApplets]);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((e, applet, index) => {
    setDraggedApplet({ applet, index });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedApplet(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(async (e, dropIndex) => {
    e.preventDefault();

    if (!draggedApplet || draggedApplet.index === dropIndex) {
      setDraggedApplet(null);
      setDragOverIndex(null);
      return;
    }

    // Create new array with reordered applets
    const reorderedApplets = [...applets];
    const [movedApplet] = reorderedApplets.splice(draggedApplet.index, 1);
    reorderedApplets.splice(dropIndex, 0, movedApplet);

    // Update order_index for each applet
    const updatedApplets = reorderedApplets.map((applet, index) => ({
      ...applet,
      order_index: index
    }));

    // Optimistic update
    setApplets(updatedApplets);

    // Call API to persist the new order
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applets: updatedApplets })
        }
      );

      if (!response.ok) {
        // Revert on error
        fetchApplets();
        toast.error('Failed to reorder applets');
      } else {
        toast.success('Applets reordered successfully');
      }
    } catch (error) {
      // Revert on error
      fetchApplets();
      toast.error('Failed to reorder applets');
    }

    setDraggedApplet(null);
    setDragOverIndex(null);
  }, [applets, draggedApplet, projectId, projectletId, fetchApplets]);

  const getStatusColor = useCallback((status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-600',
      active: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      awaiting_review: 'bg-purple-100 text-purple-700',
      revision_requested: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      completed: 'bg-green-100 text-green-700',
      skipped: 'bg-gray-100 text-gray-500'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // If we started with library open, show only the library selector
  if (startWithLibraryOpen && showAddApplet) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold mb-4">Choose an Applet to Add</h3>
        <div className="grid grid-cols-2 gap-4">
          {libraryApplets.map((applet) => {
            const Icon = APPLET_ICONS[applet.type] || FileText;
            const colorClass = APPLET_COLORS[applet.type];

            return (
              <button
                key={applet.id}
                onClick={() => addAppletFromLibrary(applet)}
                className={`p-4 rounded-lg border-2 ${colorClass} hover:opacity-80 transition-opacity text-left`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold">{applet.name}</h4>
                    {applet.description && (
                      <p className="text-sm opacity-75 mt-1">{applet.description}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Applets in {projectletName}</h3>
        <button
          onClick={() => setShowAddApplet(true)}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Applet
        </button>
      </div>

      {/* Applets List */}
      <div className="space-y-3">
        {applets.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No applets added yet</p>
            <button
              onClick={() => setShowAddApplet(true)}
              className="mt-4 text-black hover:underline"
            >
              Add your first applet
            </button>
          </div>
        ) : (
          applets.map((applet, index) => {

            const Icon = APPLET_ICONS[applet.type] || FileText;
            const colorClass = APPLET_COLORS[applet.type] || 'bg-gray-100 text-gray-700';
            const isExpanded = expandedApplet === applet.id;
            const isEditing = editingApplet === applet.id;

            return (
              <div
                key={applet.id}
                className={`border-2 rounded-lg p-4 ${colorClass} ${
                  dragOverIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                } ${
                  draggedApplet?.index === index ? 'opacity-50' : ''
                } transition-all`}
                draggable
                onDragStart={(e) => handleDragStart(e, applet, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="mr-3 mt-1 cursor-move">
                      <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    </div>
                    <Icon className="w-5 h-5 mr-3 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-500 mr-2">
                          #{index + 1}
                        </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={applet.name}
                            onChange={(e) => {
                              const updated = [...applets];
                              updated[index].name = e.target.value;
                              setApplets(updated);
                            }}
                            className="font-bold bg-white px-2 py-1 rounded"
                          />
                        ) : (
                          <h4 className="font-bold">{applet.name}</h4>
                        )}
                      </div>

                      {applet.description && (
                        <p className="text-sm opacity-75 mt-1">{applet.description}</p>
                      )}

                      {/* Status and Actions */}
                      <div className="flex items-center space-x-2 mt-3">
                        <select
                          value={applet.status}
                          onChange={(e) => updateAppletStatus(applet.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(applet.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="in_progress">In Progress</option>
                          <option value="awaiting_review">Awaiting Review</option>
                          <option value="revision_requested">Revision Requested</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="skipped">Skipped</option>
                        </select>

                        {applet.completion_percentage > 0 && (
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${applet.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs ml-2">{applet.completion_percentage}%</span>
                          </div>
                        )}

                        {/* User Progress Summary */}
                        {applet.user_progress_summary && applet.user_progress_summary.total_users > 0 && (
                          <div className="flex items-center space-x-2 ml-4">
                            <div className="flex items-center text-xs">
                              {applet.user_progress_summary.completed_count > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                  ✓ {applet.user_progress_summary.completed_count} completed
                                </span>
                              )}
                              {applet.user_progress_summary.in_progress_count > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded ml-1">
                                  ⏳ {applet.user_progress_summary.in_progress_count} in progress
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Type-specific content */}
                      {applet.type === 'form' && (
                        <div className="mt-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Form:</span>
                            <select
                              value={applet.form_id || ''}
                              onChange={(e) => {
                                if (e.target.value === 'create_new') {
                                  // Set this applet as selected and show form config modal
                                  setSelectedLibraryApplet(applet);
                                  setShowFormConfig(true);
                                  setFormConfigMode('create');
                                } else if (e.target.value) {

                                  updateApplet(applet.id, { 
                                    form_id: e.target.value,
                                    config: { 
                                      ...applet.config,
                                      form_id: e.target.value 
                                    }
                                  });
                                }
                              }}
                              className="px-2 py-1 bg-white border rounded text-sm flex-1 max-w-xs"
                            >
                              <option value="">Select a form...</option>
                              <option value="create_new" className="font-semibold text-purple-600">
                                ✨ Create New Form with AI
                              </option>
                              <optgroup label="Existing Forms">
                                {availableForms.map(form => (
                                  <option key={form.id} value={form.id}>
                                    {form.title}
                                  </option>
                                ))}
                              </optgroup>
                            </select>

                            {/* Form action icons */}
                            {applet.form_id && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    const form = availableForms.find(f => f.id === applet.form_id);
                                    if (form?.urlId || form?.url_id) {
                                      window.open(`/forms/${form.urlId || form.url_id}`, '_blank');
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="View Form"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => router.push(`/edit/${applet.form_id}`)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="Edit Form"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => router.push(`/responses/${applet.form_id}`)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="View Responses"
                                >
                                  <BarChart className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to remove this form from the applet?')) {
                                      updateApplet(applet.id, { 
                                        form_id: null,
                                        config: { 
                                          ...applet.config,
                                          form_id: null 
                                        }
                                      });
                                    }
                                  }}
                                  className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                                  title="Remove Form"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {applet.type === 'upload' && (
                        <div className="mt-2 space-y-1">
                          {applet.upload_url && (
                            <div className="text-sm">
                              <Link className="w-4 h-4 inline mr-1" />
                              <a href={applet.upload_url} target="_blank" className="underline">
                                View Upload
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* DEBUG: Show for ALL applets */}
                      <div className="mt-3 p-2 border border-purple-500 bg-purple-50 rounded">
                        <div className="text-xs font-bold text-purple-700">DEBUG INFO:</div>
                        <div className="text-xs">Name: "{applet.name}"</div>
                        <div className="text-xs">Type: "{applet.type || 'NULL'}"</div>
                        <div className="text-xs">Is Link Submission? {applet.name === 'Link Submission' ? 'YES' : 'NO'}</div>
                      </div>

                      {/* Original link submission logic */}
                      {(() => {
                        // Check if this is a link submission applet based on type, name, or description
                        const isLinkSubmission = applet.type === 'link_submission' || 
                                                applet.name === 'Link Submission' ||
                                                applet.description?.includes('Share deliverables and resources');

                        if (isLinkSubmission) {
                          return (
                            <div className="mt-3 p-3 border-2 border-blue-500 bg-blue-50 rounded-lg">
                              <div className="text-xs font-bold text-blue-700 mb-2">Link Submission Configuration:</div>
                          {/* Inline configuration - always visible */}
                          <div className="space-y-2">
                            {/* Heading */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Heading</label>
                              <input
                                type="text"
                                value={applet.config?.heading || 'Project Deliverables'}
                                onChange={(e) => debouncedUpdateApplet(applet.id, {
                                  config: { ...(applet.config || {}), heading: e.target.value }
                                })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium bg-white"
                                placeholder="Enter heading (e.g., Project Deliverables)"
                              />
                            </div>

                            {/* Description */}
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">Description</label>
                              <textarea
                                value={applet.config?.description || 'Please review the following materials:'}
                                onChange={(e) => debouncedUpdateApplet(applet.id, {
                                  config: { ...(applet.config || {}), description: e.target.value }
                                })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                                rows="2"
                                placeholder="Add description or instructions..."
                              />
                            </div>

                            {/* Links section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">Links</span>
                                <button
                                  onClick={() => {
                                    const currentLinks = applet.config?.links || [];
                                    const newLinks = [...currentLinks, { text: 'View Link', url: 'https://example.com', description: '' }];
                                    updateApplet(applet.id, {
                                      config: { ...(applet.config || {}), links: newLinks }
                                    });
                                  }}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                >
                                  + Add Link
                                </button>
                              </div>

                              {(applet.config?.links || []).length === 0 ? (
                                <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">
                                  No links added yet. Click "Add Link" to get started.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {(applet.config?.links || []).map((link, idx) => (
                                    <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                                      <div className="flex items-start space-x-2">
                                        <div className="flex-1 space-y-1">
                                          <input
                                            type="text"
                                            value={link.text || ''}
                                            onChange={(e) => {
                                              const newLinks = [...(applet.config?.links || [])];
                                              newLinks[idx] = { ...newLinks[idx], text: e.target.value };
                                              updateApplet(applet.id, {
                                                config: { ...(applet.config || {}), links: newLinks }
                                              });
                                            }}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                            placeholder="Link text (e.g., View Mockups)"
                                          />
                                          <input
                                            type="url"
                                            value={link.url || ''}
                                            onChange={(e) => {
                                              const newLinks = [...(applet.config?.links || [])];
                                              newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                                              updateApplet(applet.id, {
                                                config: { ...(applet.config || {}), links: newLinks }
                                              });
                                            }}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                            placeholder="https://..."
                                          />
                                          <input
                                            type="text"
                                            value={link.description || ''}
                                            onChange={(e) => {
                                              const newLinks = [...(applet.config?.links || [])];
                                              newLinks[idx] = { ...newLinks[idx], description: e.target.value };
                                              updateApplet(applet.id, {
                                                config: { ...(applet.config || {}), links: newLinks }
                                              });
                                            }}
                                            className="w-full px-2 py-1 border rounded text-sm"
                                            placeholder="Optional description"
                                          />
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newLinks = (applet.config?.links || []).filter((_, i) => i !== idx);
                                            updateApplet(applet.id, {
                                              config: { ...(applet.config || {}), links: newLinks }
                                            });
                                          }}
                                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                          title="Remove link"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                      {link.url && (
                                        <a 
                                          href={link.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center mt-1 text-xs text-blue-600 hover:text-blue-700"
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Test link
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Allow acknowledgment checkbox */}
                            <div className="flex items-center p-2 bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                id={`ack-${applet.id}`}
                                checked={applet.config?.allow_client_acknowledgment || false}
                                onChange={(e) => updateApplet(applet.id, {
                                  config: { ...(applet.config || {}), allow_client_acknowledgment: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <label htmlFor={`ack-${applet.id}`} className="text-xs">
                                Allow client to mark as reviewed
                              </label>
                            </div>
                          </div>
                        </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 p-3 bg-white/50 rounded space-y-2">
                          {/* User Completion Details */}
                          {applet.user_progress_summary && applet.user_progress_summary.completed_users?.length > 0 && (
                            <div>
                              <span className="text-xs font-bold">Completed by:</span>
                              <div className="mt-1 space-y-1">
                                {applet.user_progress_summary.completed_users.map((user, idx) => (
                                  <div key={idx} className="text-xs flex items-center">
                                    <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                                    <span className="text-gray-600">
                                      {user.user_id.startsWith('client_') ? 
                                        `Client ${user.user_id.substring(7, 13)}...` : 
                                        user.user_id}
                                    </span>
                                    {user.completed_at && (
                                      <span className="text-gray-400 ml-2">
                                        {new Date(user.completed_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {applet.client_instructions && (
                            <div>
                              <span className="text-xs font-bold">Client Instructions:</span>
                              <p className="text-sm">{applet.client_instructions}</p>
                            </div>
                          )}
                          {applet.internal_notes && (
                            <div>
                              <span className="text-xs font-bold">Internal Notes:</span>
                              <p className="text-sm">{applet.internal_notes}</p>
                            </div>
                          )}
                          <div className="flex items-center space-x-4 text-xs">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={applet.requires_approval}
                                onChange={(e) => updateApplet(applet.id, { requires_approval: e.target.checked })}
                                className="mr-1"
                              />
                              Requires Approval
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={applet.client_can_skip}
                                onChange={(e) => updateApplet(applet.id, { client_can_skip: e.target.checked })}
                                className="mr-1"
                              />
                              Client Can Skip
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setExpandedApplet(isExpanded ? null : applet.id)}
                      className="p-1 hover:bg-white/50 rounded"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingApplet(isEditing ? null : applet.id)}
                      className="p-1 hover:bg-white/50 rounded"
                    >
                      {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteApplet(applet.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Applet Modal */}
      {showAddApplet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Choose an Applet</h3>
                <button
                  onClick={() => {
                    setShowAddApplet(false);
                    setSelectedLibraryApplet(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {libraryApplets.map((applet) => {
                  const Icon = APPLET_ICONS[applet.type] || FileText;
                  const colorClass = APPLET_COLORS[applet.type];
                  const isSelected = selectedLibraryApplet?.id === applet.id;

                  return (
                    <button
                      key={applet.id}
                      onClick={() => {
                        // Directly add the applet when clicked
                        addAppletFromLibrary(applet);
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all hover:border-black hover:shadow-lg border-gray-200`}
                    >
                      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold">{applet.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{applet.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {applet.tags?.map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-sm text-gray-500 text-center mt-4">
                Click any applet to add it to your projectlet
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Configuration Modal */}
      {showFormConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Configure Form Applet</h3>
                <button
                  onClick={() => {
                    setShowFormConfig(false);
                    setFormConfigMode('select');
                    setSelectedFormId(null);
                    setSelectedLibraryApplet(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Mode Selection */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Choose how you want to add a form to this projectlet
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormConfigMode('create')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formConfigMode === 'create'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Create New Form</div>
                    <div className="text-sm mt-1 opacity-80">
                      Use AI to generate a form with project context
                    </div>
                  </button>

                  <button
                    onClick={() => setFormConfigMode('select')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formConfigMode === 'select'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Link className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Use Existing Form</div>
                    <div className="text-sm mt-1 opacity-80">
                      Select from previously created forms
                    </div>
                  </button>
                </div>
              </div>

              {/* Create New Form */}
              {formConfigMode === 'create' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Create Your Form</h4>
                    <p className="text-sm text-blue-700">
                      Choose how you want to create your form:
                    </p>
                  </div>

                  {/* AI Form Builder Option */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start">
                      <Bot className="w-5 h-5 text-purple-600 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-semibold">AI-Powered Form Builder</h5>
                        <p className="text-sm text-gray-600 mt-1">
                          The AI will have access to project details, client info, and knowledge base
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={createFormWithAI}
                      disabled={creatingForm}
                      className="w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center"
                    >
                      {creatingForm ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Opening Form Builder...
                        </>
                      ) : (
                        <>
                          <Bot className="w-5 h-5 mr-2" />
                          Create Form with AI
                        </>
                      )}
                    </button>
                  </div>

                  {/* Markdown Upload Option */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start">
                      <FileUp className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-semibold">Upload Markdown File</h5>
                        <p className="text-sm text-gray-600 mt-1">
                          Upload an existing form in markdown format (.md file)
                        </p>
                      </div>
                    </div>
                    <label className="block">
                      <input
                        type="file"
                        accept=".md"
                        onChange={handleMarkdownUpload}
                        disabled={uploadingMarkdown}
                        className="hidden"
                      />
                      <button
                        onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
                        disabled={uploadingMarkdown}
                        className="w-full bg-white border-2 border-black text-black px-6 py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center"
                      >
                        {uploadingMarkdown ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                            Processing Markdown...
                          </>
                        ) : (
                          <>
                            <FileUp className="w-5 h-5 mr-2" />
                            Upload Markdown File
                          </>
                        )}
                      </button>
                    </label>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    Markdown format: Use sections, field types (text, select, checkbox, etc.), and options
                  </div>
                </div>
              )}

              {/* Select Existing Form */}
              {formConfigMode === 'select' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select a Form</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                      {availableForms.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">
                          No forms available. Create one first.
                        </p>
                      ) : (
                        availableForms.map((form) => (
                          <div
                            key={form.id}
                            className={`w-full p-3 rounded-lg border transition-all ${
                              selectedFormId === form.id
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => setSelectedFormId(form.id)}
                                className="flex-1 text-left"
                              >
                                <div className="font-medium">{form.title}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {form.response_count || 0} responses • 
                                  Status: {form.status || 'active'}
                                </div>
                              </button>
                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  onClick={() => window.open(`/forms/${form.url_id}`, '_blank')}
                                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                  title="View Form"
                                >
                                  <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => window.open(`/edit/${form.id}`, '_blank')}
                                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                  title="Edit Form"
                                >
                                  <Edit className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete "${form.title}"?`)) {
                                      try {
                                        const response = await fetch(`/api/aloa-forms/${form.id}`, {
                                          method: 'DELETE'
                                        });

                                        if (response.ok) {
                                          const data = await response.json();
                                          toast.success('Form deleted successfully');
                                          // Refresh the forms list after a short delay to allow toast to show
                                          setTimeout(() => {
                                            window.location.reload();
                                          }, 500);
                                        } else {
                                          // Only parse JSON if response is not ok
                                          try {
                                            const errorData = await response.json();
                                            toast.error(errorData.error || 'Failed to delete form');
                                          } catch {
                                            toast.error('Failed to delete form');
                                          }
                                        }
                                      } catch (error) {

                                        toast.error('Failed to delete form');
                                      }
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                  title="Delete Form"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={attachExistingForm}
                    disabled={!selectedFormId}
                    className={`w-full px-6 py-3 rounded-lg flex items-center justify-center ${
                      selectedFormId
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Link className="w-5 h-5 mr-2" />
                    Attach Selected Form
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Form Builder Modal */}
      {showAIFormBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-display font-bold text-aloa-black uppercase tracking-tight flex items-center gap-2">
                    <Bot className="w-6 h-6 text-purple-600" />
                    AI Form Builder
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Creating form for: {projectletName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAIFormBuilder(false);
                    setSelectedLibraryApplet(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {projectKnowledge && projectKnowledge.stats && projectKnowledge.stats.totalDocuments > 0 && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start">
                    <Bot className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">
                        AI Context Loaded
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Using {projectKnowledge.stats.totalDocuments} knowledge documents 
                        and {projectKnowledge.stats.totalInsights} insights from this project
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <AIChatFormBuilder 
                onMarkdownGenerated={handleAIFormGenerated}
                projectContext={projectKnowledge?.project?.ai_context}
                projectName={projectletName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ProjectletAppletsManager, (prevProps, nextProps) => {
  // Re-render only if key props change
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.projectletId === nextProps.projectletId &&
    prevProps.projectletName === nextProps.projectletName &&
    prevProps.startWithLibraryOpen === nextProps.startWithLibraryOpen &&
    prevProps.availableForms === nextProps.availableForms &&
    prevProps.onAppletsUpdated === nextProps.onAppletsUpdated
  );
});