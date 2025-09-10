'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, Edit2, Trash2, FileText } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import PasswordProtect from '@/components/PasswordProtect';
import toast from 'react-hot-toast';

function Projects() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
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
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (!response.ok) throw new Error('Failed to create project');

      toast.success('Project created successfully');
      setShowCreateModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
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
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');

      toast.success('Project deleted successfully');
      fetchProjects();
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-sm"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-aloa-black uppercase tracking-tight">
              Projects
            </h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="card text-center py-16">
            <Folder className="w-16 h-16 mx-auto mb-4 text-aloa-gray opacity-50" />
            <p className="text-xl text-aloa-gray mb-8 font-body">
              No projects yet. Create your first project to organize your forms.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mx-auto"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="card hover:shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-0.5 cursor-pointer"
                onClick={() => router.push(`/dashboard?project=${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <Folder className="w-8 h-8 text-aloa-black" />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement edit functionality
                        toast.info('Edit functionality coming soon');
                      }}
                      className="p-2 hover:bg-aloa-sand rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
                
                <h3 className="text-xl font-display font-bold text-aloa-black mb-2 uppercase tracking-wider">
                  {project.name}
                </h3>
                
                {project.description && (
                  <p className="text-aloa-gray mb-4 font-body line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-aloa-gray" />
                    <span className="text-aloa-gray">
                      {project.formCount || 0} {project.formCount === 1 ? 'form' : 'forms'}
                    </span>
                  </div>
                  <span className="text-aloa-gray text-xs">
                    {formatDate(project.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-aloa-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-display font-bold text-aloa-black mb-6 uppercase tracking-wider">
              Create New Project
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                  placeholder="Enter project name..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors resize-none"
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
                className="flex-1 px-4 py-2 border-2 border-aloa-sand text-aloa-black rounded-lg hover:bg-aloa-sand transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                className="flex-1 btn-primary"
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
    <PasswordProtect>
      <Projects />
    </PasswordProtect>
  );
}