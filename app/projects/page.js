'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Folder, 
  Edit2, 
  Trash2, 
  FileText,
  Briefcase,
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import AuthGuard from '@/components/AuthGuard';
import toast from 'react-hot-toast';

function Projects() {
  const router = useRouter();
  const [formProjects, setFormProjects] = useState([]);
  const [aloaProjects, setAloaProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('aloa'); // 'aloa' or 'forms'

  useEffect(() => {
    fetchAllProjects();
  }, []);

  const fetchAllProjects = async () => {
    try {
      // Fetch both types of projects
      const [formResponse, aloaResponse] = await Promise.all([
        fetch('/api/aloa-projects'),
        fetch('/api/aloa-projects')
      ]);
      
      const formData = await formResponse.json();
      const aloaData = await aloaResponse.json();
      
      setFormProjects(formData || []);
      setAloaProjects(aloaData.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/aloa-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (!response.ok) throw new Error('Failed to create project');

      toast.success('Project created successfully');
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
      fetchAllProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? All forms in this project will be moved to "Uncategorized".')) {
      return;
    }

    try {
      const response = await fetch(`/api/aloa-projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      toast.success('Project deleted successfully');
      fetchAllProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
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
        <LoadingSpinner message="Loading projects..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8]">
      {/* Header */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Project Hub</h1>
              <p className="text-gray-300 mt-1">Manage all your projects in one place</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/project-setup')}
                className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                New Aloa Project
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Form Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-md">
          <button
            onClick={() => setActiveTab('aloa')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
              activeTab === 'aloa' 
                ? 'bg-black text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Aloa Projects ({aloaProjects.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
              activeTab === 'forms' 
                ? 'bg-black text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center">
              <FileText className="w-5 h-5 mr-2" />
              Form Projects ({formProjects.length})
            </div>
          </button>
        </div>

        {/* Aloa Projects Tab */}
        {activeTab === 'aloa' && (
          <div>
            {aloaProjects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Aloa Projects Yet</h3>
                <p className="text-gray-600 mb-6">
                  Start your first web design project with our gamified workflow
                </p>
                <button
                  onClick={() => router.push('/project-setup')}
                  className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-semibold"
                >
                  Initialize First Project
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {aloaProjects.map((project) => {
                  const progress = project.stats?.completionPercentage || 0;
                  const statusColors = {
                    'initiated': 'bg-gray-100 text-gray-700',
                    'in_progress': 'bg-blue-100 text-blue-700',
                    'design_phase': 'bg-purple-100 text-purple-700',
                    'development_phase': 'bg-indigo-100 text-indigo-700',
                    'completed': 'bg-green-100 text-green-700',
                    'on_hold': 'bg-red-100 text-red-700'
                  };
                  
                  return (
                    <div
                      key={project.id}
                      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => router.push(`/admin/project/${project.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <Briefcase className="w-8 h-8 text-black mr-3" />
                          <div>
                            <h3 className="font-bold text-lg">{project.project_name}</h3>
                            <p className="text-sm text-gray-600">{project.client_name}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColors[project.status] || 'bg-gray-100 text-gray-700'
                        }`}>
                          {project.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-black h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{project.aloa_project_team?.length || 0} team</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>
                            {project.estimated_completion_date 
                              ? new Date(project.estimated_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'No deadline'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/project/${project.id}/dashboard`);
                          }}
                          className="flex-1 text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Client View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/project/${project.id}`);
                          }}
                          className="flex-1 text-sm bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Admin View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Form Projects Tab */}
        {activeTab === 'forms' && (
          <div>
            {formProjects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Form Projects Yet</h3>
                <p className="text-gray-600 mb-6">
                  Create projects to organize your forms
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-semibold"
                >
                  Create Form Project
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {formProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => router.push(`/dashboard?project=${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <Folder className="w-8 h-8 text-black mr-3" />
                        <div>
                          <h3 className="font-bold text-lg">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>
                          {project.formCount || 0} {project.formCount === 1 ? 'form' : 'forms'}
                        </span>
                      </div>
                      <span className="text-xs">
                        {formatDate(project.created_at)}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard?project=${project.id}`);
                      }}
                      className="mt-4 w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                    >
                      View Forms
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">
              Create Form Project
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors"
                  placeholder="Enter project name..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black focus:outline-none transition-colors resize-none"
                  rows={3}
                  placeholder="Enter project description..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewProject({ name: '', description: '' });
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                className="flex-1 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                disabled={creating || !newProject.name.trim()}
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <Projects />
    </AuthGuard>
  );
}