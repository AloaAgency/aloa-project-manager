'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PasswordProtect from '@/components/PasswordProtect';
import { 
  Briefcase, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  Calendar,
  TrendingUp,
  Eye,
  Settings,
  ChevronRight,
  Zap,
  FileText,
  Upload
} from 'lucide-react';

function AdminProjectsPageContent() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/aloa-projects');
      const data = await response.json();
      
      if (data.projects) {
        setProjects(data.projects);
        calculateStats(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectList) => {
    setStats({
      total: projectList.length,
      active: projectList.filter(p => p.status === 'in_progress' || p.status === 'design_phase' || p.status === 'development_phase').length,
      completed: projectList.filter(p => p.status === 'completed').length,
      onHold: projectList.filter(p => p.status === 'on_hold').length
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'initiated': 'bg-gray-100 text-gray-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'design_phase': 'bg-purple-100 text-purple-700',
      'development_phase': 'bg-indigo-100 text-indigo-700',
      'review': 'bg-yellow-100 text-yellow-700',
      'completed': 'bg-green-100 text-green-700',
      'on_hold': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const getProgressPercentage = (project) => {
    // This would be calculated based on completed projectlets
    // For now, using a simple status-based calculation
    const statusProgress = {
      'initiated': 10,
      'in_progress': 30,
      'design_phase': 50,
      'development_phase': 75,
      'review': 90,
      'completed': 100,
      'on_hold': 0
    };
    return statusProgress[project.status] || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#faf8f3] to-[#f5f1e8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
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
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-300 mt-1">Aloa Project Management</p>
            </div>
            <button
              onClick={() => router.push('/project-setup')}
              className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Projects</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <Briefcase className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">{stats.active}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">On Hold</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{stats.onHold}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">All Projects</h2>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No projects yet</p>
              <button
                onClick={() => router.push('/project-setup')}
                className="mt-4 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timeline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.project_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {project.id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{project.client_name}</div>
                          <div className="text-sm text-gray-500">{project.client_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.status)}`}>
                          {project.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-black h-2 rounded-full"
                              style={{ width: `${getProgressPercentage(project)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {getProgressPercentage(project)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(project.estimated_completion_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/admin/project/${project.id}`)}
                            className="text-black hover:text-gray-600 flex items-center"
                            title="Admin View"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Manage
                          </button>
                          <button
                            onClick={() => router.push(`/project/${project.id}/dashboard`)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                            title="Client View"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/project-setup')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <Plus className="w-8 h-8 text-black mb-2" />
                <h3 className="font-bold">New Project</h3>
                <p className="text-sm text-gray-600 mt-1">Initialize a new client project</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/forms')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <FileText className="w-8 h-8 text-black mb-2" />
                <h3 className="font-bold">Form Templates</h3>
                <p className="text-sm text-gray-600 mt-1">Manage project form templates</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/team')}
            className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <Users className="w-8 h-8 text-black mb-2" />
                <h3 className="font-bold">Team Management</h3>
                <p className="text-sm text-gray-600 mt-1">Manage team access and roles</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProjectsPage() {
  return (
    <PasswordProtect>
      <AdminProjectsPageContent />
    </PasswordProtect>
  );
}