'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Upload,
  Users,
  Clock,
  CheckCircle,
  Lock,
  Unlock,
  PlayCircle,
  FileText,
  Link,
  Mail,
  Calendar,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function AdminProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [projectlets, setProjectlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProjectlet, setEditingProjectlet] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    fetchProjectData();
  }, [params.projectId]);

  const fetchProjectData = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/aloa-projects/${params.projectId}`);
      const projectData = await projectRes.json();
      setProject(projectData);

      // Fetch projectlets
      const projectletsRes = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`);
      const projectletsData = await projectletsRes.json();
      setProjectlets(projectletsData.projectlets);

      // Fetch team members
      const teamRes = await fetch(`/api/aloa-projects/${params.projectId}/team`);
      const teamData = await teamRes.json();
      if (teamData.team) {
        setTeamMembers(teamData.team);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProjectletStatus = async (projectletId, newStatus) => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectletId,
          status: newStatus
        })
      });

      if (response.ok) {
        // Refresh projectlets
        fetchProjectData();
      }
    } catch (error) {
      console.error('Error updating projectlet:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'locked': 'bg-gray-100 text-gray-600 border-gray-300',
      'available': 'bg-blue-50 text-blue-700 border-blue-300',
      'in_progress': 'bg-yellow-50 text-yellow-700 border-yellow-300',
      'client_review': 'bg-purple-50 text-purple-700 border-purple-300',
      'revision_requested': 'bg-orange-50 text-orange-700 border-orange-300',
      'completed': 'bg-green-50 text-green-700 border-green-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'locked': return <Lock className="w-4 h-4" />;
      case 'available': return <Unlock className="w-4 h-4" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4" />;
      case 'client_review': return <Clock className="w-4 h-4" />;
      case 'revision_requested': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/projects')}
                className="mr-4 hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{project?.project_name}</h1>
                <p className="text-gray-300">Admin Management View</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/project/${params.projectId}/dashboard`)}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                View as Client
              </button>
              <button className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Edit Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Projectlets */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Projectlets Management</h2>
                <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Projectlet
                </button>
              </div>

              <div className="space-y-4">
                {projectlets.map((projectlet, index) => (
                  <div key={projectlet.id} className={`border-2 rounded-lg p-4 ${getStatusColor(projectlet.status)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-sm font-medium text-gray-500 mr-3">
                            Step {index + 1}
                          </span>
                          <h3 className="font-bold">{projectlet.name}</h3>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center">
                            {getStatusIcon(projectlet.status)}
                            <span className="ml-1 font-medium">
                              {projectlet.status.replace(/_/g, ' ')}
                            </span>
                          </span>
                          
                          {projectlet.deadline && (
                            <span className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(projectlet.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Admin Controls */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <select
                            value={projectlet.status}
                            onChange={(e) => updateProjectletStatus(projectlet.id, e.target.value)}
                            className="px-3 py-1 border rounded-lg text-sm"
                          >
                            <option value="locked">Locked</option>
                            <option value="available">Available</option>
                            <option value="in_progress">In Progress</option>
                            <option value="client_review">Client Review</option>
                            <option value="revision_requested">Revision Requested</option>
                            <option value="completed">Completed</option>
                          </select>

                          {projectlet.type === 'form' && projectlet.aloa_project_forms?.[0] && (
                            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                              View Responses ({projectlet.aloa_project_forms[0].responses_received || 0})
                            </button>
                          )}

                          {projectlet.type === 'design' && (
                            <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 flex items-center">
                              <Link className="w-3 h-3 mr-1" />
                              Add Figma Link
                            </button>
                          )}

                          {projectlet.type === 'content' && (
                            <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 flex items-center">
                              <Upload className="w-3 h-3 mr-1" />
                              Upload Copy
                            </button>
                          )}

                          <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                            Edit
                          </button>
                        </div>

                        {/* Metadata Display */}
                        {projectlet.metadata && Object.keys(projectlet.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-white/50 rounded-lg text-sm">
                            <div className="font-medium mb-1">Metadata:</div>
                            <pre className="text-xs text-gray-600">
                              {JSON.stringify(projectlet.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold mb-4">Project Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Client:</span>
                  <div className="font-medium">{project?.client_name}</div>
                  <div className="text-gray-600">{project?.client_email}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-medium capitalize">
                    {project?.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Timeline:</span>
                  <div className="font-medium">
                    {project?.start_date && new Date(project.start_date).toLocaleDateString()}
                    {' - '}
                    {project?.estimated_completion_date && new Date(project.estimated_completion_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Scope:</span>
                  <div className="font-medium">
                    {project?.rules?.main_pages} main pages, {project?.rules?.aux_pages} aux pages
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Team Members</h3>
                <button className="text-black hover:bg-gray-100 p-1 rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{member.name || member.email}</div>
                      <div className="text-xs text-gray-600 capitalize">{member.role}</div>
                    </div>
                    <button className="text-gray-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Status Update
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </button>
                <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Deliverables
                </button>
                <button className="w-full text-left px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Archive Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}