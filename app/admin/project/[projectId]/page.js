'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import PasswordProtect from '@/components/PasswordProtect';
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
  Trash2,
  Globe,
  FolderOpen,
  Brain,
  File,
  Database,
  Eye,
  ChevronDown,
  ChevronUp,
  Palette,
  MessageSquare,
  MoreVertical,
  Pencil,
  GripVertical,
  Settings,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamically import the applets manager to avoid SSR issues
const ProjectletAppletsManager = dynamic(() => import('@/components/ProjectletAppletsManager'), {
  ssr: false
});

function AdminProjectPageContent() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [projectlets, setProjectlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProjectlet, setEditingProjectlet] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableForms, setAvailableForms] = useState([]);
  const [projectForms, setProjectForms] = useState([]);
  const [showProjectletEditor, setShowProjectletEditor] = useState(false);
  const [selectedProjectlet, setSelectedProjectlet] = useState(null);
  const [showFormsSection, setShowFormsSection] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [showKnowledgeUpload, setShowKnowledgeUpload] = useState(false);
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);
  const [projectletApplets, setProjectletApplets] = useState({}); // Store applets for each projectlet
  const [loadingApplets, setLoadingApplets] = useState({});
  const [editingProjectletName, setEditingProjectletName] = useState(null);
  const [tempProjectletName, setTempProjectletName] = useState('');
  const [draggedProjectlet, setDraggedProjectlet] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showAppletManager, setShowAppletManager] = useState(false);
  const [selectedProjectletForApplet, setSelectedProjectletForApplet] = useState(null);

  useEffect(() => {
    fetchProjectData();
    fetchKnowledgeBase();
  }, [params.projectId]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setShowActionMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchKnowledgeBase = async () => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`);
      const data = await response.json();
      setKnowledgeBase(data);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    }
  };

  const handleKnowledgeUpdate = async (field, value) => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (response.ok) {
        toast.success('Knowledge base updated');
        fetchKnowledgeBase();
      }
    } catch (error) {
      console.error('Error updating knowledge:', error);
      toast.error('Failed to update knowledge base');
    }
  };

  const handleFileUpload = async (file) => {
    setUploadingKnowledge(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', params.projectId);
    
    try {
      const uploadResponse = await fetch('/api/forms/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      const { fileUrl } = await uploadResponse.json();
      
      const knowledgeResponse = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          title: file.name,
          file_url: fileUrl,
          importance: 7
        })
      });
      
      if (knowledgeResponse.ok) {
        toast.success('File added to knowledge base');
        fetchKnowledgeBase();
        setShowKnowledgeUpload(false);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingKnowledge(false);
    }
  };

  const deleteKnowledgeDoc = async (knowledgeId) => {
    if (!confirm('Are you sure you want to delete this knowledge document?')) return;
    
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/knowledge?knowledgeId=${knowledgeId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Knowledge document deleted');
        fetchKnowledgeBase();
      }
    } catch (error) {
      console.error('Error deleting knowledge:', error);
      toast.error('Failed to delete knowledge document');
    }
  };

  const fetchAppletsForProjectlet = async (projectletId) => {
    setLoadingApplets(prev => ({ ...prev, [projectletId]: true }));
    try {
      const response = await fetch(
        `/api/aloa-projects/${params.projectId}/projectlets/${projectletId}/applets`
      );
      const data = await response.json();
      setProjectletApplets(prev => ({ ...prev, [projectletId]: data.applets || [] }));
    } catch (error) {
      console.error('Error fetching applets:', error);
    } finally {
      setLoadingApplets(prev => ({ ...prev, [projectletId]: false }));
    }
  };

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
      
      // Fetch applets for each projectlet
      if (projectletsData.projectlets) {
        projectletsData.projectlets.forEach(projectlet => {
          fetchAppletsForProjectlet(projectlet.id);
        });
      }

      // Fetch team members
      const teamRes = await fetch(`/api/aloa-projects/${params.projectId}/team`);
      const teamData = await teamRes.json();
      if (teamData.team) {
        setTeamMembers(teamData.team);
      }

      // Fetch ALL forms for dropdown
      const formsRes = await fetch('/api/forms');
      const formsData = await formsRes.json();
      setAvailableForms(formsData.forms || []);
      
      // Filter forms that belong to this project
      const projectSpecificForms = (formsData.forms || []).filter(
        form => form.project_id === params.projectId
      );
      setProjectForms(projectSpecificForms);
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProjectletDetails = async () => {
    if (!selectedProjectlet) return;

    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectletId: selectedProjectlet.id,
          name: selectedProjectlet.name,
          description: selectedProjectlet.description,
          type: selectedProjectlet.type,
          formId: selectedProjectlet.formId,
          deadline: selectedProjectlet.deadline,
          metadata: selectedProjectlet.metadata
        })
      });

      if (response.ok) {
        setShowProjectletEditor(false);
        setSelectedProjectlet(null);
        fetchProjectData();
      }
    } catch (error) {
      console.error('Error saving projectlet:', error);
    }
  };

  const openProjectletEditor = (projectlet) => {
    setSelectedProjectlet({
      ...projectlet,
      formId: projectlet.aloa_project_forms?.[0]?.form_id || null
    });
    setShowProjectletEditor(true);
  };

  const openAppletManager = (projectlet) => {
    setSelectedProjectletForApplet(projectlet);
    setShowAppletManager(true);
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

  const startEditingName = (projectlet) => {
    setEditingProjectletName(projectlet.id);
    setTempProjectletName(projectlet.name);
  };

  const saveProjectletName = async (projectletId) => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectletId,
          name: tempProjectletName
        })
      });

      if (response.ok) {
        setEditingProjectletName(null);
        fetchProjectData();
        toast.success('Name updated');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  const deleteProjectlet = async (projectletId) => {
    if (!confirm('Are you sure you want to delete this entire projectlet? This will also delete all applets within it.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/aloa-projects/${params.projectId}/projectlets?projectletId=${projectletId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Projectlet deleted');
        fetchProjectData();
        setShowActionMenu(null);
      }
    } catch (error) {
      console.error('Error deleting projectlet:', error);
      toast.error('Failed to delete projectlet');
    }
  };

  const duplicateProjectlet = async (projectlet) => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${projectlet.name} (Copy)`,
          description: projectlet.description,
          type: projectlet.type,
          metadata: projectlet.metadata
        })
      });

      if (response.ok) {
        toast.success('Projectlet duplicated');
        fetchProjectData();
        setShowActionMenu(null);
      }
    } catch (error) {
      console.error('Error duplicating projectlet:', error);
      toast.error('Failed to duplicate projectlet');
    }
  };

  const addProjectlet = async () => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `New Projectlet`,
          description: 'Click to edit description',
          type: 'design'
        })
      });

      if (response.ok) {
        const { projectlet } = await response.json();
        // Add the new projectlet to the list
        setProjectlets([...projectlets, projectlet]);
        // Initialize empty applets for the new projectlet
        setProjectletApplets(prev => ({
          ...prev,
          [projectlet.id]: []
        }));
      }
    } catch (error) {
      console.error('Error creating projectlet:', error);
    }
  };

  const handleDragStart = (e, projectlet, index) => {
    setDraggedProjectlet({ projectlet, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (!draggedProjectlet || draggedProjectlet.index === targetIndex) {
      return;
    }

    const newProjectlets = [...projectlets];
    const [movedProjectlet] = newProjectlets.splice(draggedProjectlet.index, 1);
    newProjectlets.splice(targetIndex, 0, movedProjectlet);
    
    setProjectlets(newProjectlets);
    setDraggedProjectlet(null);

    // Update order in database
    try {
      const updates = newProjectlets.map((p, idx) => ({
        id: p.id,
        order_index: idx
      }));
      
      // You might need to create an endpoint for bulk order update
      // For now, we'll just update locally
      toast.success('Order updated');
    } catch (error) {
      console.error('Error updating order:', error);
      fetchProjectData(); // Revert on error
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
        {/* Knowledge Base Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Brain className="w-6 h-6 mr-2 text-purple-600" />
              <h2 className="text-2xl font-bold">Project Knowledge Base</h2>
            </div>
            <button
              onClick={() => setShowKnowledgeUpload(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </button>
          </div>

          {knowledgeBase && (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline w-4 h-4 mr-1" />
                    Existing Website URL
                  </label>
                  <input
                    type="url"
                    value={knowledgeBase.project?.existing_url || ''}
                    onChange={(e) => handleKnowledgeUpdate('existing_url', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FolderOpen className="inline w-4 h-4 mr-1" />
                    Google Drive Assets URL
                  </label>
                  <input
                    type="url"
                    value={knowledgeBase.project?.google_drive_url || ''}
                    onChange={(e) => handleKnowledgeUpdate('google_drive_url', e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Base Knowledge */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Database className="inline w-4 h-4 mr-1" />
                  Base Knowledge (Key Information)
                </label>
                <textarea
                  value={knowledgeBase.project?.base_knowledge?.notes || ''}
                  onChange={(e) => handleKnowledgeUpdate('base_knowledge', { notes: e.target.value })}
                  placeholder="Enter key information about this project: brand guidelines, target audience, business goals, etc."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Knowledge Documents */}
              {knowledgeBase.knowledge && knowledgeBase.knowledge.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Knowledge Documents ({knowledgeBase.knowledge.length})</h3>
                  <div className="space-y-2">
                    {knowledgeBase.knowledge.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center flex-1">
                          <File className="w-4 h-4 mr-2 text-gray-600" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-gray-600">
                              Type: {doc.type} • Importance: {doc.importance}/10
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteKnowledgeDoc(doc.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {knowledgeBase.insights && knowledgeBase.insights.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">AI Insights ({knowledgeBase.insights.length})</h3>
                  <div className="space-y-2">
                    {knowledgeBase.insights.map((insight) => (
                      <div key={insight.id} className="p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-medium text-purple-600 uppercase">{insight.category}</span>
                            <p className="text-sm mt-1">{insight.insight}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              {knowledgeBase.stats && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{knowledgeBase.stats.totalDocuments}</p>
                    <p className="text-sm text-gray-600">Documents</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{knowledgeBase.stats.totalInsights}</p>
                    <p className="text-sm text-gray-600">Insights</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="text-xs text-gray-500">
                      {knowledgeBase.stats.lastUpdated ? new Date(knowledgeBase.stats.lastUpdated).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Projectlets */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Projectlets Management</h2>
                <button 
                  onClick={addProjectlet}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Projectlet
                </button>
              </div>

              <div className="space-y-4">
                {projectlets.map((projectlet, index) => {
                  const applets = projectletApplets[projectlet.id] || [];
                  const isLoadingApplets = loadingApplets[projectlet.id];
                  const isEditingName = editingProjectletName === projectlet.id;
                  const APPLET_ICONS = {
                    form: FileText,
                    review: Eye,
                    upload: Upload,
                    signoff: CheckCircle,
                    moodboard: Palette,
                    content_gather: MessageSquare
                  };

                  return (
                    <div 
                      key={projectlet.id} 
                      className={`border-2 rounded-lg ${getStatusColor(projectlet.status)} transition-all hover:shadow-lg`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, projectlet, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      {/* Header */}
                      <div className="p-4 pb-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start flex-1">
                            {/* Drag Handle */}
                            <div className="mr-3 mt-1 cursor-move opacity-50 hover:opacity-100">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center mb-2 group">
                                <span className="text-sm font-medium text-gray-500 mr-3">
                                  #{index + 1}
                                </span>
                                
                                {isEditingName ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={tempProjectletName}
                                      onChange={(e) => setTempProjectletName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveProjectletName(projectlet.id);
                                        if (e.key === 'Escape') setEditingProjectletName(null);
                                      }}
                                      className="font-bold text-lg px-2 py-1 border rounded"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => saveProjectletName(projectlet.id)}
                                      className="p-1 hover:bg-green-100 rounded"
                                    >
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    </button>
                                    <button
                                      onClick={() => setEditingProjectletName(null)}
                                      className="p-1 hover:bg-red-100 rounded"
                                    >
                                      <X className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <h3 className="font-bold text-lg">{projectlet.name}</h3>
                                    <button
                                      onClick={() => startEditingName(projectlet)}
                                      className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            
                            {projectlet.description && (
                              <p className="text-sm text-gray-600 mb-2">{projectlet.description}</p>
                            )}

                            <div className="flex items-center space-x-4 text-sm">
                              {projectlet.deadline && (
                                <span className="flex items-center text-gray-600">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {new Date(projectlet.deadline).toLocaleDateString()}
                                </span>
                              )}
                              
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {applets.length} applet{applets.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          </div>

                          {/* Status Toggle and Actions - Top Right */}
                          <div className="flex items-start space-x-2">
                            <select
                              value={projectlet.status}
                              onChange={(e) => updateProjectletStatus(projectlet.id, e.target.value)}
                              className={`px-3 py-1 border rounded-lg text-sm font-medium ${getStatusColor(projectlet.status)}`}
                            >
                              <option value="locked">🔒 Locked</option>
                              <option value="available">✅ Available</option>
                              <option value="in_progress">⏳ In Progress</option>
                              <option value="client_review">👁 Review</option>
                              <option value="revision_requested">🔄 Revision</option>
                              <option value="completed">✓ Completed</option>
                            </select>
                            
                            {/* Actions Dropdown */}
                            <div className="relative action-menu-container">
                              <button
                                onClick={() => setShowActionMenu(showActionMenu === projectlet.id ? null : projectlet.id)}
                                className="p-1 hover:bg-white/50 rounded"
                                title="More actions"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                              
                              {showActionMenu === projectlet.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                                  <button
                                    onClick={() => {
                                      openProjectletEditor(projectlet);
                                      setShowActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                                  >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Edit Details
                                  </button>
                                  <button
                                    onClick={() => duplicateProjectlet(projectlet)}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => deleteProjectlet(projectlet.id)}
                                    className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Projectlet
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Applets Section */}
                      <div className="p-4 pt-2">
                        {isLoadingApplets ? (
                          <div className="py-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
                          </div>
                        ) : applets.length > 0 ? (
                          <div className="space-y-2">
                            {applets.map((applet, appletIndex) => {
                              const Icon = APPLET_ICONS[applet.type] || FileText;
                              return (
                                <div key={applet.id} className="flex items-center justify-between p-2 bg-white/50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <Icon className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium">{applet.name}</span>
                                    {applet.status && (
                                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(applet.status)}`}>
                                        {applet.status}
                                      </span>
                                    )}
                                  </div>
                                  {applet.completion_percentage > 0 && (
                                    <div className="flex items-center">
                                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-green-600 h-1.5 rounded-full"
                                          style={{ width: `${applet.completion_percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-xs ml-2 text-gray-500">{applet.completion_percentage}%</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-4 text-center border-2 border-dashed border-gray-300 rounded-lg bg-white/30">
                            <p className="text-sm text-gray-500 mb-2">No applets added yet</p>
                            <button
                              onClick={() => openAppletManager(projectlet)}
                              className="inline-flex items-center px-3 py-1 bg-black text-white rounded-lg hover:bg-gray-800 text-sm"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add First Applet
                            </button>
                          </div>
                        )}
                        
                        {/* Quick Add Applet Button */}
                        {applets.length > 0 && (
                          <button
                            onClick={() => openAppletManager(projectlet)}
                            className="mt-2 w-full py-2 border-2 border-dashed border-gray-400 rounded-lg hover:border-black hover:bg-white/50 transition-all flex items-center justify-center text-sm text-gray-600 hover:text-black"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Applet
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

            {/* Project Forms */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Project Forms</h3>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {projectForms.length} forms
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                {projectForms.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No forms created for this project yet
                  </p>
                ) : (
                  projectForms.slice(0, 5).map(form => (
                    <div key={form.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{form.title}</p>
                        <p className="text-xs text-gray-500">
                          {form.response_count || 0} responses • {form.status}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => window.open(`/forms/${form.id}`, '_blank')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="View Form"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => router.push(`/edit/${form.id}`)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Edit Form"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="space-y-2 border-t pt-4">
                <button
                  onClick={() => {
                    // Create form with project context
                    const url = `/create?project=${params.projectId}&projectName=${encodeURIComponent(project?.project_name || '')}`;
                    router.push(url);
                  }}
                  className="w-full bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Form
                </button>
                
                {projectForms.length > 5 && (
                  <button
                    onClick={() => setShowFormsSection(true)}
                    className="w-full text-sm text-gray-600 hover:text-black"
                  >
                    View all {projectForms.length} forms →
                  </button>
                )}
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

      {/* Projectlet Editor Modal */}
      {showProjectletEditor && selectedProjectlet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Edit Projectlet</h2>
                <button
                  onClick={() => {
                    setShowProjectletEditor(false);
                    setSelectedProjectlet(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={selectedProjectlet.name}
                  onChange={(e) => setSelectedProjectlet({...selectedProjectlet, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={selectedProjectlet.description || ''}
                  onChange={(e) => setSelectedProjectlet({...selectedProjectlet, description: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={selectedProjectlet.type}
                  onChange={(e) => setSelectedProjectlet({...selectedProjectlet, type: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="form">Form</option>
                  <option value="design">Design</option>
                  <option value="content">Content</option>
                  <option value="development">Development</option>
                  <option value="review">Review</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>

              {/* Form Attachment */}
              {selectedProjectlet.type === 'form' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attached Form
                  </label>
                  <select
                    value={selectedProjectlet.formId || ''}
                    onChange={(e) => setSelectedProjectlet({...selectedProjectlet, formId: e.target.value || null})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">No form attached</option>
                    {availableForms.map(form => (
                      <option key={form.id} value={form.id}>
                        {form.title} ({form.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-2">
                    Attach an existing form or create a new one from the Forms Dashboard
                  </p>
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={() => window.open('/create', '_blank')}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200"
                    >
                      Create New Form
                    </button>
                    {selectedProjectlet.formId && (
                      <button
                        onClick={() => window.open(`/edit/${selectedProjectlet.formId}`, '_blank')}
                        className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200"
                      >
                        Edit Form
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={selectedProjectlet.deadline ? selectedProjectlet.deadline.split('T')[0] : ''}
                  onChange={(e) => setSelectedProjectlet({...selectedProjectlet, deadline: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Metadata (JSON) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Metadata (JSON)
                </label>
                <textarea
                  value={JSON.stringify(selectedProjectlet.metadata || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const metadata = JSON.parse(e.target.value);
                      setSelectedProjectlet({...selectedProjectlet, metadata});
                    } catch (error) {
                      // Invalid JSON, just update the text
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  rows={5}
                />
              </div>

              {/* Applets Section */}
              <div className="border-t pt-6">
                <ProjectletAppletsManager
                  projectId={params.projectId}
                  projectletId={selectedProjectlet.id}
                  projectletName={selectedProjectlet.name}
                  availableForms={availableForms}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowProjectletEditor(false);
                  setSelectedProjectlet(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveProjectletDetails}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Upload Modal */}
      {showKnowledgeUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Upload Knowledge Document</h3>
              <button
                onClick={() => setShowKnowledgeUpload(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-600 cursor-pointer"
                onClick={() => document.getElementById('knowledge-file-input').click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Click to upload a document</p>
                <p className="text-sm text-gray-500 mt-1">PDF, DOC, TXT, or Markdown files</p>
                <input
                  id="knowledge-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>

              {uploadingKnowledge && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Uploading document...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Applet Manager Modal */}
      {showAppletManager && selectedProjectletForApplet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  Add Applets to {selectedProjectletForApplet.name}
                </h2>
                <button
                  onClick={() => {
                    setShowAppletManager(false);
                    setSelectedProjectletForApplet(null);
                    // Refresh applets for this projectlet
                    fetchProjectletApplets(selectedProjectletForApplet.id);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <ProjectletAppletsManager
                projectId={params.projectId}
                projectletId={selectedProjectletForApplet.id}
                projectletName={selectedProjectletForApplet.name}
                availableForms={availableForms}
                onAppletsUpdated={() => {
                  // Refresh applets for this projectlet
                  fetchProjectletApplets(selectedProjectletForApplet.id);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProjectPage() {
  return (
    <PasswordProtect>
      <AdminProjectPageContent />
    </PasswordProtect>
  );
}