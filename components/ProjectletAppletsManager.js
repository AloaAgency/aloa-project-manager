'use client';

import { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const APPLET_ICONS = {
  form: FileText,
  review: Eye,
  upload: Upload,
  signoff: CheckCircle,
  moodboard: Palette,
  sitemap_builder: Gamepad2,
  content_gather: MessageSquare,
  feedback_loop: MessageSquare
};

const APPLET_COLORS = {
  form: 'bg-blue-100 text-blue-700 border-blue-300',
  review: 'bg-purple-100 text-purple-700 border-purple-300',
  upload: 'bg-green-100 text-green-700 border-green-300',
  signoff: 'bg-red-100 text-red-700 border-red-300',
  moodboard: 'bg-pink-100 text-pink-700 border-pink-300',
  sitemap_builder: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  content_gather: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  feedback_loop: 'bg-orange-100 text-orange-700 border-orange-300'
};

export default function ProjectletAppletsManager({ 
  projectId, 
  projectletId, 
  projectletName,
  availableForms = []
}) {
  const [applets, setApplets] = useState([]);
  const [libraryApplets, setLibraryApplets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddApplet, setShowAddApplet] = useState(false);
  const [selectedLibraryApplet, setSelectedLibraryApplet] = useState(null);
  const [expandedApplet, setExpandedApplet] = useState(null);
  const [editingApplet, setEditingApplet] = useState(null);
  const [showFormConfig, setShowFormConfig] = useState(false);
  const [formConfigMode, setFormConfigMode] = useState('select'); // 'select' or 'create'
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [creatingForm, setCreatingForm] = useState(false);

  useEffect(() => {
    fetchApplets();
    fetchLibraryApplets();
  }, [projectletId]);

  const fetchApplets = async () => {
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`
      );
      const data = await response.json();
      setApplets(data.applets || []);
    } catch (error) {
      console.error('Error fetching applets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryApplets = async () => {
    try {
      const response = await fetch('/api/aloa-applets/library?active=true');
      const data = await response.json();
      setLibraryApplets(data.applets || []);
    } catch (error) {
      console.error('Error fetching library applets:', error);
    }
  };

  const addAppletFromLibrary = async (libraryApplet) => {
    // If it's a form applet, show the form configuration modal
    if (libraryApplet.type === 'form') {
      setSelectedLibraryApplet(libraryApplet);
      setShowFormConfig(true);
      setShowAddApplet(false);
      return;
    }

    // For other applet types, add directly
    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            library_applet_id: libraryApplet.id,
            name: libraryApplet.name,
            description: libraryApplet.description,
            type: libraryApplet.type,
            config: libraryApplet.default_config,
            requires_approval: libraryApplet.requires_approval,
            client_instructions: libraryApplet.client_instructions
          })
        }
      );

      if (response.ok) {
        toast.success('Applet added successfully');
        fetchApplets();
        setShowAddApplet(false);
        setSelectedLibraryApplet(null);
      }
    } catch (error) {
      console.error('Error adding applet:', error);
      toast.error('Failed to add applet');
    }
  };

  const createFormWithAI = async () => {
    setCreatingForm(true);
    try {
      // Get project knowledge context
      const knowledgeResponse = await fetch(`/api/aloa-projects/${projectId}/knowledge`);
      const knowledgeData = await knowledgeResponse.json();
      
      // Navigate to form creator with project context
      const formCreatorUrl = `/create?project=${projectId}&projectlet=${projectletId}&projectletName=${encodeURIComponent(projectletName)}`;
      window.open(formCreatorUrl, '_blank');
      
      setShowFormConfig(false);
      toast.success('Opening AI Form Builder with project context...');
    } catch (error) {
      console.error('Error creating form:', error);
      toast.error('Failed to open form builder');
    } finally {
      setCreatingForm(false);
    }
  };

  const attachExistingForm = async () => {
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
      console.error('Error attaching form:', error);
      toast.error('Failed to attach form');
    }
  };

  const updateApplet = async (appletId, updates) => {
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
      console.error('Error updating applet:', error);
      toast.error('Failed to update applet');
    }
  };

  const updateAppletStatus = async (appletId, status) => {
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
      console.error('Error updating applet status:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteApplet = async (appletId) => {
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
      console.error('Error deleting applet:', error);
      toast.error('Failed to delete applet');
    }
  };

  const getStatusColor = (status) => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
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
                className={`border-2 rounded-lg p-4 ${colorClass}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="mr-3 mt-1">
                      <GripVertical className="w-5 h-5 text-gray-400" />
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
                      </div>

                      {/* Type-specific content */}
                      {applet.type === 'form' && applet.form_id && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Linked Form:</span>
                          <select
                            value={applet.form_id || ''}
                            onChange={(e) => updateApplet(applet.id, { form_id: e.target.value })}
                            className="ml-2 px-2 py-1 bg-white rounded text-sm"
                          >
                            <option value="">Select a form...</option>
                            {availableForms.map(form => (
                              <option key={form.id} value={form.id}>
                                {form.title}
                              </option>
                            ))}
                          </select>
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

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 p-3 bg-white/50 rounded space-y-2">
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
                <h3 className="text-xl font-bold">Add Applet from Library</h3>
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
                      onClick={() => setSelectedLibraryApplet(applet)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        isSelected 
                          ? 'border-black shadow-lg' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
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

              {selectedLibraryApplet && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold mb-2">Configure Applet</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={selectedLibraryApplet.name}
                        onChange={(e) => setSelectedLibraryApplet({
                          ...selectedLibraryApplet,
                          name: e.target.value
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Client Instructions</label>
                      <textarea
                        placeholder="Instructions shown to the client..."
                        onChange={(e) => setSelectedLibraryApplet({
                          ...selectedLibraryApplet,
                          client_instructions: e.target.value
                        })}
                        className="w-full px-3 py-2 border rounded-lg"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddApplet(false);
                    setSelectedLibraryApplet(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedLibraryApplet && addAppletFromLibrary(selectedLibraryApplet)}
                  disabled={!selectedLibraryApplet}
                  className={`px-6 py-2 rounded-lg ${
                    selectedLibraryApplet
                      ? 'bg-black text-white hover:bg-gray-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add Applet
                </button>
              </div>
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
                    <h4 className="font-semibold text-blue-900 mb-2">AI-Powered Form Builder</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      The AI will have access to:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1 ml-4">
                      <li>• Project details and requirements</li>
                      <li>• Client information</li>
                      <li>• Projectlet context: {projectletName}</li>
                      <li>• Previously uploaded knowledge base</li>
                    </ul>
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
                        <Plus className="w-5 h-5 mr-2" />
                        Create Form with AI
                      </>
                    )}
                  </button>
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
                          <button
                            key={form.id}
                            onClick={() => setSelectedFormId(form.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              selectedFormId === form.id
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">{form.title}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {form.response_count || 0} responses • 
                              Status: {form.status || 'active'}
                            </div>
                          </button>
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
    </div>
  );
}