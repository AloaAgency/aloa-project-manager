'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Link, 
  Upload, 
  CheckCircle, 
  Users, 
  Calendar,
  Milestone,
  GripVertical
} from 'lucide-react';

const STEP_TYPE_ICONS = {
  form: FileText,
  link: Link,
  upload: Upload,
  approval: CheckCircle,
  content: FileText,
  meeting: Users,
  milestone: Milestone
};

const STEP_TYPE_LABELS = {
  form: 'Form (Client fills out)',
  link: 'Link (Share URL)',
  upload: 'Upload (Team uploads)',
  approval: 'Approval (Client approves)',
  content: 'Content (Submit content)',
  meeting: 'Meeting (Schedule call)',
  milestone: 'Milestone (Achievement)'
};

export default function ProjectletStepsManager({ 
  projectId, 
  projectletId, 
  projectletName,
  availableForms = [] 
}) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({
    name: '',
    type: 'form',
    description: '',
    is_required: true,
    form_id: null,
    link_url: null
  });

  useEffect(() => {
    if (projectletId) {
      fetchSteps();
    }
  }, [projectletId]);

  const fetchSteps = async () => {
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/projectlets/${projectletId}/steps`);
      const data = await response.json();
      setSteps(data.steps || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const addStep = async () => {
    if (!newStep.name) return;

    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/projectlets/${projectletId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStep)
      });

      if (response.ok) {
        fetchSteps();
        setShowAddStep(false);
        setNewStep({
          name: '',
          type: 'form',
          description: '',
          is_required: true,
          form_id: null,
          link_url: null
        });
      }
    } catch (error) {

    }
  };

  const deleteStep = async (stepId) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/projectlets/${projectletId}/steps?stepId=${stepId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchSteps();
      }
    } catch (error) {

    }
  };

  const updateStepStatus = async (stepId, status) => {
    try {
      await fetch(`/api/aloa-projects/${projectId}/projectlets/${projectletId}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, status })
      });
      fetchSteps();
    } catch (error) {

    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading steps...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Projectlet Steps</h3>
          <p className="text-sm text-gray-500">Define the actions needed to complete "{projectletName}"</p>
        </div>
        <button
          onClick={() => setShowAddStep(true)}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </button>
      </div>

      {/* Steps List */}
      {steps.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No steps defined yet</p>
          <p className="text-sm text-gray-500 mt-1">Add steps to break down this projectlet into actionable items</p>
          <button
            onClick={() => setShowAddStep(true)}
            className="mt-4 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            Add First Step
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = STEP_TYPE_ICONS[step.type] || FileText;
            return (
              <div key={step.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="flex items-center mr-3">
                    <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-2 text-gray-600" />
                      <h4 className="font-semibold">{step.name}</h4>
                      {step.is_required && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                      )}
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${
                        step.status === 'completed' ? 'bg-green-100 text-green-700' :
                        step.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {step.status || 'pending'}
                      </span>
                    </div>

                    {step.description && (
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    )}

                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {STEP_TYPE_LABELS[step.type]}
                      </span>

                      {step.form_id && (
                        <button className="text-xs text-blue-600 hover:underline">
                          View Form
                        </button>
                      )}

                      {step.link_url && (
                        <a 
                          href={step.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Open Link →
                        </a>
                      )}

                      {step.completed_at && (
                        <span className="text-xs text-gray-500">
                          Completed {new Date(step.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <select
                      value={step.status || 'pending'}
                      onChange={(e) => updateStepStatus(step.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="skipped">Skipped</option>
                    </select>

                    <button
                      onClick={() => deleteStep(step.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Step Modal */}
      {showAddStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Step</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Step Name *
                </label>
                <input
                  type="text"
                  value={newStep.name}
                  onChange={(e) => setNewStep({...newStep, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g., Fill out design preferences"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newStep.type}
                  onChange={(e) => setNewStep({...newStep, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {Object.entries(STEP_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {newStep.type === 'form' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Form (optional)
                  </label>
                  <select
                    value={newStep.form_id || ''}
                    onChange={(e) => setNewStep({...newStep, form_id: e.target.value || null})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">No form selected</option>
                    {availableForms.map(form => (
                      <option key={form.id} value={form.id}>
                        {form.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can attach an existing form or create one later
                  </p>
                </div>
              )}

              {newStep.type === 'link' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newStep.link_url || ''}
                    onChange={(e) => setNewStep({...newStep, link_url: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="https://..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add a Figma link, staging site, or any external resource
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newStep.description}
                  onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  rows={2}
                  placeholder="Brief description of what needs to be done"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStep.is_required}
                    onChange={(e) => setNewStep({...newStep, is_required: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">This step is required for projectlet completion</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStep(false);
                  setNewStep({
                    name: '',
                    type: 'form',
                    description: '',
                    is_required: true,
                    form_id: null,
                    link_url: null
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addStep}
                disabled={!newStep.name}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Add Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}