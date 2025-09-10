'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Eye, BarChart, ExternalLink, Trash2, Edit2, Brain, Folder, FolderOpen, MoveRight, Lock, Unlock } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import PasswordProtect from '@/components/PasswordProtect';
import toast from 'react-hot-toast';

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [forms, setForms] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') || 'all');
  const [loading, setLoading] = useState(true);
  const [selectedForms, setSelectedForms] = useState([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchForms();
  }, []);

  useEffect(() => {
    fetchForms();
  }, [selectedProject]);

  const fetchForms = async () => {
    try {
      const url = selectedProject && selectedProject !== 'all' 
        ? `/api/forms?project=${selectedProject}`
        : '/api/forms';
      const response = await fetch(url);
      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedForms.length === 0) {
      toast.error('Please select at least one form');
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch('/api/forms/bulk-assign-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formIds: selectedForms,
          projectId: bulkProjectId || null
        })
      });

      if (!response.ok) throw new Error('Failed to assign forms');

      toast.success(`Successfully assigned ${selectedForms.length} form(s) to project`);
      setSelectedForms([]);
      setShowBulkAssign(false);
      setBulkProjectId('');
      fetchForms();
    } catch (error) {
      console.error('Error assigning forms:', error);
      toast.error('Failed to assign forms to project');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleFormSelection = (formId) => {
    setSelectedForms(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    );
  };

  const toggleFormStatus = async (formId, currentStatus) => {
    const isClosing = currentStatus !== false;
    const action = isClosing ? 'close' : 'reopen';
    
    if (!confirm(`Are you sure you want to ${action} this form?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/by-id/${formId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !isClosing,
          closed_message: isClosing ? 'This survey is now closed. Thank you for your interest!' : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update form status');
      }

      toast.success(isClosing ? 'Form closed successfully' : 'Form reopened successfully');
      fetchForms();
    } catch (error) {
      console.error('Error toggling form status:', error);
      toast.error('Failed to update form status');
    }
  };

  const deleteForm = async (formId) => {
    if (!confirm('Are you sure you want to delete this form and all its responses?')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/by-id/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      toast.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-sm"
          >
            ← Back to Home
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-aloa-black uppercase tracking-tight">
              Dashboard
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/projects')}
                className="px-4 py-2 border-2 border-aloa-sand text-aloa-black hover:bg-aloa-sand transition-colors flex items-center"
              >
                <Folder className="w-5 h-5 mr-2" />
                Manage Projects
              </button>
              <button
                onClick={() => router.push('/create')}
                className="btn-primary flex items-center justify-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Form
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedForms.length > 0 && (
          <div className="mb-4 p-4 bg-aloa-sand rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedForms.length} form(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkAssign(true)}
                className="px-3 py-1 bg-aloa-black text-aloa-white rounded hover:bg-aloa-gray transition-colors flex items-center gap-2"
              >
                <MoveRight className="w-4 h-4" />
                Assign to Project
              </button>
              <button
                onClick={() => setSelectedForms([])}
                className="px-3 py-1 border border-aloa-gray text-aloa-gray rounded hover:bg-aloa-gray hover:text-aloa-white transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Project Filter */}
        {projects.length > 0 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedProject('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedProject === 'all'
                  ? 'bg-aloa-black text-aloa-white'
                  : 'bg-aloa-sand hover:bg-aloa-gray hover:text-aloa-white'
              }`}
            >
              All Forms
            </button>
            <button
              onClick={() => setSelectedProject('uncategorized')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedProject === 'uncategorized'
                  ? 'bg-aloa-black text-aloa-white'
                  : 'bg-aloa-sand hover:bg-aloa-gray hover:text-aloa-white'
              }`}
            >
              Uncategorized
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  selectedProject === project.id
                    ? 'bg-aloa-black text-aloa-white'
                    : 'bg-aloa-sand hover:bg-aloa-gray hover:text-aloa-white'
                }`}
              >
                {selectedProject === project.id ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                {project.name}
              </button>
            ))}
          </div>
        )}

        {forms.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-xl text-aloa-gray mb-8 font-body">
              You haven't created any forms yet
            </p>
            <button
              onClick={() => router.push('/create')}
              className="btn-primary mx-auto"
            >
              Create Your First Form
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {forms.map((form) => (
              <div key={form._id} className="card hover:shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-0.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Checkbox for selection */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedForms.includes(form._id)}
                      onChange={() => toggleFormSelection(form._id)}
                      className="mt-1 w-4 h-4 rounded border-aloa-sand text-aloa-black focus:ring-aloa-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="text-xl sm:text-2xl font-display font-bold text-aloa-black mb-2 uppercase tracking-wider break-words">
                        {form.title}
                      </h3>
                      {form.is_active === false && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          <Lock className="w-3 h-3" />
                          CLOSED
                        </span>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-aloa-gray mb-4 font-body line-clamp-2">{form.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-display uppercase tracking-wider">
                      {form.projectName && (
                        <span className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 text-purple-900 flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {form.projectName}
                        </span>
                      )}
                      <span className="bg-aloa-sand px-3 py-1 text-aloa-black">
                        {form.fields.length} fields
                      </span>
                      <span className="bg-aloa-sand px-3 py-1 text-aloa-black">
                        {form.responseCount || 0} responses
                      </span>
                      <span className="bg-aloa-sand px-3 py-1 text-aloa-black">
                        {formatDate(form.createdAt)}
                      </span>
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:ml-4">
                    <button
                      onClick={() => toggleFormStatus(form._id, form.is_active)}
                      className={`p-2 sm:p-3 transition-all duration-300 group ${
                        form.is_active === false 
                          ? 'bg-green-100 hover:bg-green-600 hover:text-white' 
                          : 'bg-orange-100 hover:bg-orange-600 hover:text-white'
                      }`}
                      title={form.is_active === false ? 'Reopen Form' : 'Close Form'}
                    >
                      {form.is_active === false ? (
                        <Unlock className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                      )}
                    </button>
                    <button
                      onClick={() => window.open(`/forms/${form.urlId}`, '_blank')}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 group"
                      title="View Form"
                    >
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => router.push(`/edit/${form._id}`)}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 group"
                      title="Edit Form Fields"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => router.push(`/responses/${form._id}`)}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 group"
                      title="View Responses"
                    >
                      <BarChart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => router.push(`/ai-analysis/${form._id}`)}
                      className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 group"
                      title="AI Analysis"
                    >
                      <Brain className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => deleteForm(form._id)}
                      className="p-2 sm:p-3 bg-aloa-sand hover:bg-red-600 hover:text-white transition-all duration-300 group"
                      title="Delete Form"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-aloa-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-display font-bold text-aloa-black mb-4 uppercase tracking-wider">
              Assign Forms to Project
            </h2>
            
            <p className="text-sm text-aloa-gray mb-4">
              Move {selectedForms.length} selected form(s) to a project
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-aloa-gray mb-2">
                Select Project
              </label>
              <select
                value={bulkProjectId}
                onChange={(e) => setBulkProjectId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
              >
                <option value="">No Project (Uncategorized)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkAssign(false);
                  setBulkProjectId('');
                }}
                className="flex-1 px-4 py-2 border-2 border-aloa-sand text-aloa-black rounded-lg hover:bg-aloa-sand transition-colors"
                disabled={isAssigning}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                className="flex-1 btn-primary"
                disabled={isAssigning}
              >
                {isAssigning ? 'Assigning...' : 'Assign to Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PasswordProtect>
      <Dashboard />
    </PasswordProtect>
  );
}