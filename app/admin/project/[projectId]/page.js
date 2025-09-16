'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';
import useEscapeKey from '@/hooks/useEscapeKey';
import UserAvatar from '@/components/UserAvatar';
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
  Copy,
  Bell,
  ExternalLink,
  BarChart,
  Edit2,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamically import the applets manager to avoid SSR issues
const ProjectletAppletsManager = dynamic(() => import('@/components/ProjectletAppletsManager'), {
  ssr: false
});

// Dynamically import AI form builder
const AIChatFormBuilder = dynamic(() => import('@/components/AIChatFormBuilder'), {
  ssr: false
});

// Dynamically import Admin Notifications
const AdminNotifications = dynamic(() => import('@/components/AdminNotifications'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  )
});

// Dynamically import Form Builder Modal
const FormBuilderModal = dynamic(() => import('@/components/FormBuilderModal'), {
  ssr: false
});

// Dynamically import Link Submission Config
const LinkSubmissionConfig = dynamic(() => import('@/components/LinkSubmissionConfig'), {
  ssr: false
});

// Dynamically import File Upload Config
const FileUploadConfig = dynamic(() => import('@/components/FileUploadConfigStorage'), {
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
  const [isDraggingApplet, setIsDraggingApplet] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showAppletManager, setShowAppletManager] = useState(false);
  const [selectedProjectletForApplet, setSelectedProjectletForApplet] = useState(null);
  const [showAIFormBuilder, setShowAIFormBuilder] = useState(false);
  const [showFormBuilderModal, setShowFormBuilderModal] = useState(false);
  const [formBuilderContext, setFormBuilderContext] = useState(null);
  const [stakeholders, setStakeholders] = useState([]);
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [expandedApplets, setExpandedApplets] = useState({});
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [stakeholderFormData, setStakeholderFormData] = useState({
    name: '',
    email: '',
    title: '',
    role: 'decision_maker',
    phone: '',
    bio: '',
    responsibilities: '',
    preferences: '',
    linkedin_url: '',
    importance: 5,
    is_primary: false
  });

  // ESC key handlers for modals
  useEscapeKey(() => {
    setShowProjectletEditor(false);
    setSelectedProjectlet(null);
  }, showProjectletEditor);

  useEscapeKey(() => {
    setShowStakeholderForm(false);
    setEditingStakeholder(null);
    setSelectedUserId(null);
    setStakeholderFormData({
      name: '',
      email: '',
      title: '',
      role: 'decision_maker',
      phone: '',
      bio: '',
      responsibilities: '',
      preferences: '',
      linkedin_url: '',
      importance: 5,
      is_primary: false
    });
  }, showStakeholderForm);

  useEffect(() => {
    fetchProjectData();
    fetchKnowledgeBase();
    fetchStakeholders();
    fetchAvailableUsers();
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
      const uploadResponse = await fetch('/api/aloa-forms/upload', {
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

  // Stakeholder functions
  const fetchStakeholders = async () => {
    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/stakeholders`);
      const data = await response.json();
      setStakeholders(data.stakeholders || []);
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/auth/users');

      if (!response.ok) {
        console.error('Failed to fetch users:', response.status, response.statusText);
        return;
      }

      const data = await response.json();

      // Filter for client users only (including all client role types)
      const clientUsers = data.users?.filter(user =>
        user.role === 'client' ||
        user.role === 'client_admin' ||
        user.role === 'client_participant'
      ) || [];
      setAvailableUsers(clientUsers);
    } catch (error) {
      console.error('Error fetching available users:', error);
      // Ensure we always have an array, even on error
      setAvailableUsers([]);
    }
  };

  const handleSaveStakeholder = async (stakeholderData) => {
    try {
      const method = editingStakeholder ? 'PATCH' : 'POST';
      const url = editingStakeholder 
        ? `/api/aloa-projects/${params.projectId}/stakeholders?stakeholderId=${editingStakeholder.id}`
        : `/api/aloa-projects/${params.projectId}/stakeholders`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholderData)
      });

      if (response.ok) {
        toast.success(editingStakeholder ? 'Stakeholder updated' : 'Stakeholder added');
        fetchStakeholders();
        setShowStakeholderForm(false);
        setEditingStakeholder(null);
        setSelectedUserId(null);
        setStakeholderFormData({
          name: '',
          email: '',
          title: '',
          role: 'decision_maker',
          phone: '',
          bio: '',
          responsibilities: '',
          preferences: '',
          linkedin_url: '',
          importance: 5,
          is_primary: false
        });
      }
    } catch (error) {
      console.error('Error saving stakeholder:', error);
      toast.error('Failed to save stakeholder');
    }
  };

  const handleDeleteStakeholder = async (stakeholderId) => {
    if (!confirm('Are you sure you want to delete this stakeholder?')) return;

    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/stakeholders?stakeholderId=${stakeholderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Stakeholder deleted');
        fetchStakeholders();
      }
    } catch (error) {
      console.error('Error deleting stakeholder:', error);
      toast.error('Failed to delete stakeholder');
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

  const fetchProjectForms = async () => {
    try {
      const formsRes = await fetch(`/api/aloa-forms?project=${params.projectId}`);
      const formsData = await formsRes.json();
      setAvailableForms(formsData || []);
      setProjectForms(formsData || []);
    } catch (error) {
      console.error('Error fetching project forms:', error);
    }
  };

  const toggleFormStatus = async (formId, currentStatus, appletId = null) => {
    const isClosing = currentStatus !== false;
    const action = isClosing ? 'close' : 'reopen';
    
    if (!confirm(`Are you sure you want to ${action} this form?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/aloa-forms/${formId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !isClosing
        })
      });

      if (response.ok) {
        // If we have an applet ID, update its status based on form lock state
        if (appletId) {
          // Check if there are any responses for this form
          const formResponsesRes = await fetch(`/api/aloa-responses?formId=${formId}`);
          const responses = formResponsesRes.ok ? await formResponsesRes.json() : [];
          const hasResponses = responses.length > 0;
          
          if (hasResponses) {
            // Update applet status based on form lock state
            const newStatus = isClosing ? 'completed' : 'in_progress';
            await fetch(`/api/aloa-applets/${appletId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: newStatus,
                completion_percentage: isClosing ? 100 : 50,
                ...(isClosing ? { completed_at: new Date().toISOString() } : { completed_at: null })
              })
            });
          }
        }
        
        // Refresh forms
        await fetchProjectForms();
        // Refresh applets for all projectlets
        projectlets.forEach(projectlet => {
          fetchProjectletApplets(projectlet.id);
        });
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 ${action === 'close' ? 'bg-orange-600' : 'bg-green-600'} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
        toast.textContent = `Form ${action === 'close' ? 'closed' : 'reopened'} successfully`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } else {
        throw new Error('Failed to toggle form status');
      }
    } catch (error) {
      console.error('Error toggling form status:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `Failed to ${action} form`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
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
          fetchProjectletApplets(projectlet.id);
        });
      }

      // Fetch team members
      const teamRes = await fetch(`/api/aloa-projects/${params.projectId}/team`);
      const teamData = await teamRes.json();
      if (teamData.team) {
        setTeamMembers(teamData.team);
      }

      // Fetch forms for this project
      await fetchProjectForms();
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

  const fetchProjectletApplets = async (projectletId) => {
    try {
      setLoadingApplets(prev => ({ ...prev, [projectletId]: true }));
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets/${projectletId}/applets`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data.applets?.length || 0} applets for projectlet ${projectletId}:`, data.applets);
        
        // Fetch completion data for each applet
        const appletsWithCompletions = await Promise.all(
          (data.applets || []).map(async (applet) => {
            try {
              const completionRes = await fetch(
                `/api/aloa-projects/${params.projectId}/applet-completions?appletId=${applet.id}`
              );
              if (completionRes.ok) {
                const completionData = await completionRes.json();
                return {
                  ...applet,
                  completions: completionData.completions || [],
                  completion_percentage: completionData.percentage || 0,
                  totalStakeholders: completionData.totalStakeholders || 0,
                  completedCount: completionData.completedCount || 0
                };
              }
            } catch (error) {
              console.error('Error fetching completion data for applet:', error);
            }
            return applet;
          })
        );
        
        setProjectletApplets(prev => ({
          ...prev,
          [projectletId]: appletsWithCompletions
        }));
      } else {
        console.error('Failed to fetch applets:', response.status);
      }
    } catch (error) {
      console.error('Error fetching applets:', error);
    } finally {
      setLoadingApplets(prev => ({ ...prev, [projectletId]: false }));
    }
  };

  const openAppletManager = (projectlet) => {
    setSelectedProjectletForApplet(projectlet);
    setShowAppletManager(true);
  };

  // Directly add a form applet without opening the modal
  const addDirectFormApplet = async (projectlet) => {
    try {
      // Create a form applet directly
      const response = await fetch(`/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'form',
          name: 'Form',
          description: 'Collect information from clients',
          configuration: {
            form_id: null, // Will be configured inline
            required: true
          }
        })
      });

      if (!response.ok) throw new Error('Failed to add applet');
      
      // Refresh the applets for this projectlet
      fetchProjectletApplets(projectlet.id);
      
      // Show success feedback
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Form applet added! Configure it below.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
    } catch (error) {
      console.error('Error adding applet:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Failed to add applet';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
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
    // Only handle projectlet drag if it's not an applet being dragged
    if (!e.dataTransfer.getData('isApplet')) {
      setDraggedProjectlet({ projectlet, index });
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    
    // Don't handle if it's an applet being dropped
    const isApplet = e.dataTransfer.getData('isApplet');
    if (isApplet) return;
    
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
            <div className="flex items-center space-x-3">
              <AdminNotifications projectId={params.projectId} />
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

        {/* Client Stakeholders Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Users className="w-6 h-6 mr-2 text-purple-600" />
              <h2 className="text-2xl font-bold">Client Stakeholders</h2>
            </div>
            <button
              onClick={() => {
                setEditingStakeholder(null);
                setSelectedUserId(null);
                setStakeholderFormData({
                  name: '',
                  email: '',
                  title: '',
                  role: 'decision_maker',
                  phone: '',
                  bio: '',
                  responsibilities: '',
                  preferences: '',
                  linkedin_url: '',
                  importance: 5,
                  is_primary: false
                });
                setShowStakeholderForm(true);
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stakeholder
            </button>
          </div>

          {/* Stakeholders List */}
          {stakeholders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stakeholders.map((stakeholder) => (
                <div key={stakeholder.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Show avatar */}
                      <UserAvatar
                        user={{
                          id: stakeholder.user_id || stakeholder.id,
                          email: stakeholder.email,
                          full_name: stakeholder.name,
                          name: stakeholder.name,
                          avatar_url: stakeholder.user?.avatar_url
                        }}
                        size="md"
                      />
                      <div className="flex-1">
                        {stakeholder.is_primary && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full mb-2">
                            Primary Contact
                          </span>
                        )}
                        <h3 className="font-bold text-lg">{stakeholder.name}</h3>
                        {stakeholder.title && (
                          <p className="text-sm text-gray-600">{stakeholder.title}</p>
                        )}
                        {stakeholder.role && (
                          <p className="text-xs text-gray-500 capitalize mt-1">
                            Role: {stakeholder.role.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingStakeholder(stakeholder);
                          // Set the selected user ID if the stakeholder is linked to a user
                          setSelectedUserId(stakeholder.user_id || null);
                          // Initialize form data with stakeholder values for editing
                          setStakeholderFormData({
                            name: stakeholder.name || '',
                            email: stakeholder.email || '',
                            title: stakeholder.title || '',
                            role: stakeholder.role || 'decision_maker',
                            phone: stakeholder.phone || '',
                            bio: stakeholder.bio || '',
                            responsibilities: stakeholder.responsibilities || '',
                            preferences: stakeholder.preferences || '',
                            linkedin_url: stakeholder.linkedin_url || '',
                            importance: stakeholder.importance || 5,
                            is_primary: stakeholder.is_primary || false
                          });
                          setShowStakeholderForm(true);
                        }}
                        className="text-gray-600 hover:text-purple-600 p-1"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStakeholder(stakeholder.id)}
                        className="text-gray-600 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {stakeholder.email && (
                    <p className="text-sm text-gray-600 mb-1">
                      <Mail className="inline w-3 h-3 mr-1" />
                      {stakeholder.email}
                    </p>
                  )}
                  
                  {stakeholder.bio && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                      {stakeholder.bio}
                    </p>
                  )}
                  
                  {stakeholder.importance && (
                    <div className="mt-2">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Importance:</span>
                        <div className="flex">
                          {[...Array(10)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < stakeholder.importance
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No stakeholders added yet</p>
              <p className="text-sm mt-1">Add stakeholders to help AI understand your client better</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Projectlets */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Projectlets Management</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Get all applet IDs
                      const allAppletIds = [];
                      projectlets.forEach(p => {
                        const applets = projectletApplets[p.id] || [];
                        applets.forEach(a => allAppletIds.push(a.id));
                      });
                      
                      const allExpanded = allAppletIds.length > 0 && 
                                         allAppletIds.every(id => expandedApplets[id]);
                      
                      if (allExpanded) {
                        setExpandedApplets({});
                      } else {
                        const expanded = {};
                        allAppletIds.forEach(id => expanded[id] = true);
                        setExpandedApplets(expanded);
                      }
                    }}
                    className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center"
                    title="Expand/Collapse All Applets"
                  >
                    {(() => {
                      const allAppletIds = [];
                      projectlets.forEach(p => {
                        const applets = projectletApplets[p.id] || [];
                        applets.forEach(a => allAppletIds.push(a.id));
                      });
                      const allExpanded = allAppletIds.length > 0 && 
                                         allAppletIds.every(id => expandedApplets[id]);
                      return allExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Collapse All
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Expand All
                        </>
                      );
                    })()}
                  </button>
                  <button 
                    onClick={addProjectlet}
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Projectlet
                  </button>
                </div>
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
                              const formId = applet.form_id || applet.config?.form_id;
                              const form = formId ? availableForms.find(f => f.id === formId) : null;
                              const isFormLocked = form?.status === 'closed';
                              
                              return (
                                <div 
                                  key={applet.id} 
                                  className={`p-2 rounded cursor-move transition-colors group border-2 ${
                                    isFormLocked && applet.type === 'form' 
                                      ? 'bg-red-50 border-red-300 hover:bg-red-100' 
                                      : 'bg-white/50 border-transparent hover:bg-white/70'
                                  }`}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation(); // Prevent projectlet from being dragged
                                    setIsDraggingApplet(true);
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('appletId', applet.id);
                                    e.dataTransfer.setData('appletIndex', appletIndex);
                                    e.dataTransfer.setData('projectletId', projectlet.id);
                                    e.dataTransfer.setData('isApplet', 'true'); // Mark as applet drag
                                  }}
                                  onDragEnd={() => {
                                    setIsDraggingApplet(false);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#DBEAFE';
                                    e.currentTarget.style.borderColor = '#3B82F6';
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.borderColor = '';
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.borderColor = '';
                                    
                                    const isApplet = e.dataTransfer.getData('isApplet');
                                    if (!isApplet) return; // Only handle applet drops
                                    
                                    const draggedAppletId = e.dataTransfer.getData('appletId');
                                    const draggedIndex = parseInt(e.dataTransfer.getData('appletIndex'));
                                    const sourceProjectletId = e.dataTransfer.getData('projectletId');
                                    
                                    if (sourceProjectletId === projectlet.id) {
                                      // Reordering within same projectlet
                                      if (draggedIndex !== appletIndex) {
                                        const reorderedApplets = [...applets];
                                        const [movedApplet] = reorderedApplets.splice(draggedIndex, 1);
                                        reorderedApplets.splice(appletIndex, 0, movedApplet);
                                        
                                        // Update order in database
                                        try {
                                          await fetch(`/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/reorder`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              appletIds: reorderedApplets.map(a => a.id)
                                            })
                                          });
                                          fetchProjectletApplets(projectlet.id);
                                        } catch (error) {
                                          console.error('Error reordering applets:', error);
                                        }
                                      }
                                    } else {
                                      // Moving between projectlets
                                      try {
                                        // Update the applet's projectlet_id
                                        const response = await fetch(
                                          `/api/aloa-projects/${params.projectId}/projectlets/${sourceProjectletId}/applets/${draggedAppletId}`,
                                          {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              projectlet_id: projectlet.id,
                                              order_index: appletIndex
                                            })
                                          }
                                        );
                                        
                                        if (response.ok) {
                                          // Refresh both projectlets
                                          fetchProjectletApplets(sourceProjectletId);
                                          fetchProjectletApplets(projectlet.id);
                                          toast.success('Applet moved successfully');
                                        }
                                      } catch (error) {
                                        console.error('Error moving applet:', error);
                                        toast.error('Failed to move applet');
                                      }
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <GripVertical className="w-4 h-4 text-gray-400" />
                                      <Icon className="w-4 h-4 text-gray-600" />
                                      <span className="text-sm font-medium">{applet.name}</span>
                                      {applet.status && (
                                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(applet.status)}`}>
                                          {applet.status}
                                        </span>
                                      )}
                                      {isFormLocked && applet.type === 'form' && (
                                        <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded font-semibold uppercase">
                                          🔒 LOCKED
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {applet.completion_percentage > 0 && (
                                        <div className="flex items-center">
                                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                            <div
                                              className="bg-green-600 h-1.5 rounded-full"
                                              style={{ width: `${applet.completion_percentage}%` }}
                                            />
                                          </div>
                                          <span className="text-xs ml-2 text-gray-500">
                                            {applet.completedCount}/{applet.totalStakeholders} ({applet.completion_percentage}%)
                                          </span>
                                        </div>
                                      )}
                                      {/* Show avatars of users who completed this applet */}
                                      {applet.completions && applet.completions.length > 0 && (
                                        <div className="flex -space-x-2">
                                          {applet.completions.slice(0, 3).map((completion) => (
                                            <UserAvatar
                                              key={completion.user_id}
                                              user={completion.user}
                                              size="xs"
                                              className="ring-2 ring-white"
                                            />
                                          ))}
                                          {applet.completions.length > 3 && (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 ring-2 ring-white">
                                              +{applet.completions.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {/* Edit and Delete buttons */}
                                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete applet "${applet.name}"?`)) {
                                              try {
                                                const response = await fetch(
                                                  `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                  { method: 'DELETE' }
                                                );
                                                if (response.ok) {
                                                  fetchProjectletApplets(projectlet.id);
                                                }
                                              } catch (error) {
                                                console.error('Error deleting applet:', error);
                                              }
                                            }
                                          }}
                                          className="p-1 hover:bg-red-100 rounded"
                                          title="Delete applet"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-600" />
                                        </button>
                                      </div>
                                      {/* Expand/Collapse button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedApplets(prev => ({
                                            ...prev,
                                            [applet.id]: !prev[applet.id]
                                          }));
                                        }}
                                        className="p-1 hover:bg-gray-200 rounded ml-2"
                                        title={expandedApplets[applet.id] ? "Collapse" : "Expand"}
                                      >
                                        {expandedApplets[applet.id] ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Inline form selector for form applets */}
                                  {expandedApplets[applet.id] && applet.type === 'form' && (
                                    <div className="mt-2">
                                      {isFormLocked && (
                                        <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 font-medium">
                                          ⚠️ This form is locked and not accepting new responses
                                        </div>
                                      )}
                                      <div className="flex items-center space-x-2">
                                        <select
                                          value={applet.form_id || applet.config?.form_id || ''}
                                          onChange={async (e) => {
                                            if (e.target.value === 'create_new') {
                                              // Open form builder modal
                                              setShowFormBuilderModal(true);
                                              setFormBuilderContext({
                                                projectletId: projectlet.id,
                                                projectletName: projectlet.name
                                              });
                                            } else {
                                              // Update applet with selected form
                                              try {
                                                const response = await fetch(
                                                  `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                  {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      form_id: e.target.value,
                                                      config: {
                                                        ...applet.config,
                                                        form_id: e.target.value
                                                      }
                                                    })
                                                  }
                                                );
                                                if (response.ok) {
                                                  fetchProjectletApplets(projectlet.id);
                                                }
                                              } catch (error) {
                                                console.error('Error updating applet:', error);
                                              }
                                            }
                                          }}
                                          className="flex-1 max-w-xs text-sm px-2 py-1 border rounded bg-white"
                                        >
                                          <option value="">Select a form...</option>
                                          <option value="create_new">✨ Create New Form with AI</option>
                                          {availableForms.map(form => (
                                            <option key={form.id} value={form.id}>
                                              {form.title}
                                            </option>
                                          ))}
                                        </select>
                                        
                                        {/* Form action icons */}
                                        {(applet.form_id || applet.config?.form_id) && (
                                          <div className="flex items-center space-x-1">
                                            {(() => {
                                              const formId = applet.form_id || applet.config?.form_id;
                                              const form = availableForms.find(f => f.id === formId);
                                              return (
                                                <>
                                                  <button
                                                    onClick={() => toggleFormStatus(formId, form?.status === 'closed' ? false : true, applet.id)}
                                                    className={`p-1 rounded transition-colors ${
                                                      form?.status === 'closed' 
                                                        ? 'hover:bg-green-200 text-green-600' 
                                                        : 'hover:bg-orange-200 text-orange-600'
                                                    }`}
                                                    title={form?.status === 'closed' ? 'Reopen Form' : 'Close Form'}
                                                  >
                                                    {form?.status === 'closed' ? (
                                                      <Unlock className="w-4 h-4" />
                                                    ) : (
                                                      <Lock className="w-4 h-4" />
                                                    )}
                                                  </button>
                                                  <button
                                                    onClick={() => {
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
                                                    onClick={() => router.push(`/edit/${formId}`)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                    title="Edit Form"
                                                  >
                                                    <Edit2 className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    onClick={() => router.push(`/responses/${formId}`)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                    title="View Responses"
                                                  >
                                                    <BarChart className="w-4 h-4" />
                                                  </button>
                                                </>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Form statistics - below the dropdown */}
                                      {(applet.form_id || applet.config?.form_id) && (() => {
                                        const formId = applet.form_id || applet.config?.form_id;
                                        const form = availableForms.find(f => f.id === formId);
                                        if (!form) return null;
                                        
                                        return (
                                          <div className="flex items-center gap-4 mt-2 pl-2 text-xs text-gray-600">
                                            <span className="flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              {form.fields?.length || 0} FIELDS
                                            </span>
                                            <span className="flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              {form.responseCount || form.response_count || 0} RESPONSES
                                            </span>
                                            {form.createdAt && (
                                              <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(form.createdAt).toLocaleDateString('en-US', { 
                                                  month: 'short', 
                                                  day: 'numeric', 
                                                  year: 'numeric' 
                                                }).toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Inline link submission configuration */}
                                  {expandedApplets[applet.id] && (applet.type === 'link_submission' || 
                                    applet.name === 'Link Submission' ||
                                    applet.description?.includes('Share deliverables and resources')) && (
                                    <LinkSubmissionConfig
                                      applet={applet}
                                      projectId={params.projectId}
                                      projectletId={projectlet.id}
                                      onUpdate={() => fetchProjectletApplets(projectlet.id)}
                                    />
                                  )}

                                  {/* Inline file upload configuration */}
                                  {expandedApplets[applet.id] && (applet.type === 'upload' || 
                                    applet.type === 'file_upload' ||
                                    applet.name?.includes('Upload') ||
                                    applet.description?.includes('upload')) && (
                                    <FileUploadConfig
                                      applet={applet}
                                      projectId={params.projectId}
                                      projectletId={projectlet.id}
                                      onClose={() => setExpandedApplets(prev => ({ ...prev, [applet.id]: false }))}
                                    />
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Drop zone at the end of applets list */}
                            <div
                              className={`py-3 border-2 border-dashed rounded-lg transition-all ${
                                isDraggingApplet 
                                  ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50' 
                                  : 'border-transparent'
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.style.borderColor = '#3B82F6';
                                e.currentTarget.style.backgroundColor = '#DBEAFE';
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.backgroundColor = '';
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.backgroundColor = '';
                                
                                const isApplet = e.dataTransfer.getData('isApplet');
                                if (!isApplet) return; // Ignore if not an applet drag
                                
                                const draggedAppletId = e.dataTransfer.getData('appletId');
                                const sourceProjectletId = e.dataTransfer.getData('projectletId');
                                
                                if (sourceProjectletId !== projectlet.id) {
                                  // Moving from another projectlet
                                  try {
                                    const response = await fetch(
                                      `/api/aloa-projects/${params.projectId}/projectlets/${sourceProjectletId}/applets/${draggedAppletId}`,
                                      {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          projectlet_id: projectlet.id,
                                          order_index: applets.length // Add at the end
                                        })
                                      }
                                    );
                                    
                                    if (response.ok) {
                                      fetchProjectletApplets(sourceProjectletId);
                                      fetchProjectletApplets(projectlet.id);
                                      toast.success('Applet moved successfully');
                                    }
                                  } catch (error) {
                                    console.error('Error moving applet:', error);
                                    toast.error('Failed to move applet');
                                  }
                                }
                              }}
                            >
                              {isDraggingApplet && (
                                <p className="text-xs text-gray-500 text-center font-medium">Drop applet here</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`text-center border-2 border-dashed rounded-lg bg-white/30 transition-all ${
                              isDraggingApplet
                                ? 'py-6 border-gray-300 hover:border-blue-400'
                                : 'py-4 border-gray-200'
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = '#3B82F6';
                              e.currentTarget.style.backgroundColor = '#DBEAFE';
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.borderColor = '';
                              e.currentTarget.style.backgroundColor = '';
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = '';
                              e.currentTarget.style.backgroundColor = '';
                              
                              const isApplet = e.dataTransfer.getData('isApplet');
                              if (!isApplet) return; // Ignore if not an applet drag
                              
                              const draggedAppletId = e.dataTransfer.getData('appletId');
                              const sourceProjectletId = e.dataTransfer.getData('projectletId');
                              
                              if (sourceProjectletId) {
                                // Moving from another projectlet
                                try {
                                  const response = await fetch(
                                    `/api/aloa-projects/${params.projectId}/projectlets/${sourceProjectletId}/applets/${draggedAppletId}`,
                                    {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        projectlet_id: projectlet.id,
                                        order_index: 0 // First position
                                      })
                                    }
                                  );
                                  
                                  if (response.ok) {
                                    fetchProjectletApplets(sourceProjectletId);
                                    fetchProjectletApplets(projectlet.id);
                                    toast.success('Applet moved successfully');
                                  }
                                } catch (error) {
                                  console.error('Error moving applet:', error);
                                  toast.error('Failed to move applet');
                                }
                              }
                            }}
                          >
                            <p className="text-sm text-gray-500 mb-2">
                              {isDraggingApplet ? 'Drop applet here' : 'No applets added yet'}
                            </p>
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {form.response_count || 0} responses • {form.status}
                          </p>
                          {/* Show avatars of form respondents if available */}
                          {form.respondents && form.respondents.length > 0 && (
                            <div className="flex -space-x-1">
                              {form.respondents.slice(0, 3).map((user) => (
                                <UserAvatar
                                  key={user.id}
                                  user={user}
                                  size="xs"
                                  className="ring-1 ring-white"
                                />
                              ))}
                              {form.respondents.length > 3 && (
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 ring-1 ring-white">
                                  +{form.respondents.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => window.open(`/forms/${form.urlId || form.url_id}`, '_blank')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="View Form"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => window.open(`/edit/${form.id}`, '_blank')}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Edit Form"
                        >
                          <Edit className="w-3 h-3" />
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
                                  // Refresh the forms list
                                  fetchProjectForms();
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
                                console.error('Error deleting form:', error);
                                toast.error('Failed to delete form');
                              }
                            }
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                          title="Delete Form"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="space-y-2 border-t pt-4">
                <button
                  onClick={() => {
                    setShowFormBuilderModal(true);
                    setFormBuilderContext({
                      projectletId: null,
                      projectletName: null
                    });
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

      {/* Stakeholder Form Modal */}
      {showStakeholderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
              </h3>
              <button
                onClick={() => {
                  setShowStakeholderForm(false);
                  setEditingStakeholder(null);
                  setSelectedUserId(null);
                  setStakeholderFormData({
                    name: '',
                    email: '',
                    title: '',
                    role: 'decision_maker',
                    phone: '',
                    bio: '',
                    responsibilities: '',
                    preferences: '',
                    linkedin_url: '',
                    importance: 5,
                    is_primary: false
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                // Determine actual user_id to use
                let actualUserId = null;
                let shouldCreateUser = false;
                let userRole = null;
                
                if (selectedUserId === 'create_new') {
                  shouldCreateUser = true;
                  userRole = formData.get('user_role') || 'client';
                } else if (selectedUserId) {
                  actualUserId = selectedUserId;
                } else if (editingStakeholder?.user_id) {
                  actualUserId = editingStakeholder.user_id;
                }
                
                const stakeholderData = {
                  user_id: actualUserId,
                  name: formData.get('name'),
                  title: formData.get('title'),
                  role: formData.get('role'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  bio: formData.get('bio'),
                  responsibilities: formData.get('responsibilities'),
                  preferences: formData.get('preferences'),
                  linkedin_url: formData.get('linkedin_url'),
                  importance: parseInt(formData.get('importance')),
                  is_primary: formData.get('is_primary') === 'on',
                  // Add user provisioning info
                  create_user: shouldCreateUser,
                  user_role: userRole
                };
                handleSaveStakeholder(stakeholderData);
              }}
              className="space-y-4"
            >
              {/* User Account Management Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">User Account Management</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingStakeholder ? 'Update User Connection' : 'Link to User Account'}
                    </label>
                    <select
                      value={selectedUserId !== null ? selectedUserId : (editingStakeholder?.user_id || '')}
                      onChange={(e) => {
                        const userId = e.target.value;
                        setSelectedUserId(userId || null);
                        
                        // Auto-fill fields if user is selected
                        if (userId && userId !== 'create_new') {
                          const user = availableUsers.find(u => u.id === userId);
                          if (user) {
                            // Update form data state
                            setStakeholderFormData(prev => ({
                              ...prev,
                              name: user.full_name || '',
                              email: user.email || ''
                            }));
                            if (editingStakeholder) {
                              setEditingStakeholder(prev => ({
                                ...prev,
                                name: user.full_name || prev.name,
                                email: user.email || prev.email,
                                user_id: userId
                              }));
                            }
                          }
                        } else if (!userId) {
                          // Clear user connection
                          if (editingStakeholder) {
                            setEditingStakeholder(prev => ({
                              ...prev,
                              user_id: null
                            }));
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- No User Account --</option>
                      <option value="create_new">✨ Create New User Account</option>
                      {(availableUsers || []).map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                          {user.projects?.length > 0 && ` - ${user.projects.map(p => p.project_name).join(', ')}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editingStakeholder 
                        ? "Update the user account connection or create a new account for this stakeholder."
                        : "Link to an existing user account or create a new one."}
                    </p>
                  </div>

                  {/* Show provisioning options when creating new user */}
                  {selectedUserId === 'create_new' && (
                    <div className="border-t pt-3 mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type for New User
                      </label>
                      <select
                        name="user_role"
                        defaultValue="client"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="client">Client (View-only access to their project)</option>
                        <option value="project_admin">Project Admin (Can manage this project)</option>
                        <option value="team_member">Team Member (Limited admin access)</option>
                      </select>
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> A new user account will be created with the email and name provided below. 
                          They will receive an invitation to set their password.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Show current connection status */}
                  {editingStakeholder && editingStakeholder.user_id && selectedUserId !== 'create_new' && (
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-800">
                        ✓ Currently connected to user account
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={editingStakeholder ? (editingStakeholder.name || '') : stakeholderFormData.name}
                    onChange={(e) => {
                      if (!editingStakeholder) {
                        setStakeholderFormData(prev => ({ ...prev, name: e.target.value }));
                      } else {
                        setEditingStakeholder(prev => ({ ...prev, name: e.target.value }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingStakeholder?.title}
                    placeholder="e.g., CEO, Product Manager"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    defaultValue={editingStakeholder?.role || 'decision_maker'}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="decision_maker">Decision Maker</option>
                    <option value="influencer">Influencer</option>
                    <option value="end_user">End User</option>
                    <option value="technical_lead">Technical Lead</option>
                    <option value="sponsor">Sponsor</option>
                    <option value="consultant">Consultant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importance (1-10)
                  </label>
                  <input
                    type="number"
                    name="importance"
                    min="1"
                    max="10"
                    defaultValue={editingStakeholder?.importance || 5}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editingStakeholder ? (editingStakeholder.email || '') : stakeholderFormData.email}
                    onChange={(e) => {
                      if (!editingStakeholder) {
                        setStakeholderFormData(prev => ({ ...prev, email: e.target.value }));
                      } else {
                        setEditingStakeholder(prev => ({ ...prev, email: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingStakeholder?.phone}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={editingStakeholder ? (editingStakeholder.linkedin_url || '') : stakeholderFormData.linkedin_url}
                  onChange={(e) => {
                    if (!editingStakeholder) {
                      setStakeholderFormData(prev => ({ ...prev, linkedin_url: e.target.value }));
                    } else {
                      setEditingStakeholder(prev => ({ ...prev, linkedin_url: e.target.value }));
                    }
                  }}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Bio and Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio / Background
                </label>
                <textarea
                  name="bio"
                  value={editingStakeholder ? (editingStakeholder.bio || '') : stakeholderFormData.bio}
                  onChange={(e) => {
                    if (!editingStakeholder) {
                      setStakeholderFormData(prev => ({ ...prev, bio: e.target.value }));
                    } else {
                      setEditingStakeholder(prev => ({ ...prev, bio: e.target.value }));
                    }
                  }}
                  rows={3}
                  placeholder="Brief background about this stakeholder..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Responsibilities
                </label>
                <textarea
                  name="responsibilities"
                  value={editingStakeholder ? (editingStakeholder.responsibilities || '') : stakeholderFormData.responsibilities}
                  onChange={(e) => {
                    if (!editingStakeholder) {
                      setStakeholderFormData(prev => ({ ...prev, responsibilities: e.target.value }));
                    } else {
                      setEditingStakeholder(prev => ({ ...prev, responsibilities: e.target.value }));
                    }
                  }}
                  rows={2}
                  placeholder="What are their main responsibilities in this project?"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication Preferences
                </label>
                <textarea
                  name="preferences"
                  value={editingStakeholder ? (editingStakeholder.preferences || '') : stakeholderFormData.preferences}
                  onChange={(e) => {
                    if (!editingStakeholder) {
                      setStakeholderFormData(prev => ({ ...prev, preferences: e.target.value }));
                    } else {
                      setEditingStakeholder(prev => ({ ...prev, preferences: e.target.value }));
                    }
                  }}
                  rows={2}
                  placeholder="Preferred communication style, meeting times, etc."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_primary"
                  id="is_primary"
                  checked={editingStakeholder ? (editingStakeholder.is_primary || false) : stakeholderFormData.is_primary}
                  onChange={(e) => {
                    if (!editingStakeholder) {
                      setStakeholderFormData(prev => ({ ...prev, is_primary: e.target.checked }));
                    } else {
                      setEditingStakeholder(prev => ({ ...prev, is_primary: e.target.checked }));
                    }
                  }}
                  className="mr-2"
                />
                <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">
                  Set as primary contact
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStakeholderForm(false);
                    setEditingStakeholder(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {editingStakeholder ? 'Update' : 'Add'} Stakeholder
                </button>
              </div>
            </form>
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
                  Choose Applet for {selectedProjectletForApplet.name}
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
                startWithLibraryOpen={true}
                onAppletsUpdated={async () => {
                  // Close the modal first
                  setShowAppletManager(false);
                  // Wait a moment for the backend to fully process
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Refresh applets for this projectlet
                  await fetchProjectletApplets(selectedProjectletForApplet.id);
                  setSelectedProjectletForApplet(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Builder Modal */}
      {showFormBuilderModal && (
        <FormBuilderModal
          isOpen={showFormBuilderModal}
          onClose={() => {
            setShowFormBuilderModal(false);
            setFormBuilderContext(null);
          }}
          projectId={params.projectId}
          projectName={project?.project_name}
          projectKnowledge={knowledgeBase}
          projectletId={formBuilderContext?.projectletId}
          projectletName={formBuilderContext?.projectletName}
          onFormCreated={(form) => {
            // Refresh forms list
            fetchProjectData();
            // If created for a projectlet, refresh its applets
            if (formBuilderContext?.projectletId) {
              fetchProjectletApplets(formBuilderContext.projectletId);
            }
          }}
        />
      )}

      {/* AI Form Builder Modal (deprecated - kept for backward compatibility) */}
      {showAIFormBuilder && selectedProjectletForApplet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Create Form with AI</h2>
                <p className="text-sm text-gray-600 mt-1">
                  For projectlet: {selectedProjectletForApplet.name}
                </p>
              </div>
              <button
                onClick={() => setShowAIFormBuilder(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <AIChatFormBuilder
                onMarkdownGenerated={async (markdown) => {
                  // Create the form and attach it to the projectlet
                  try {
                    // Navigate to create page with the markdown
                    const formData = new URLSearchParams({
                      markdown: markdown,
                      projectlet_id: selectedProjectletForApplet.id,
                      project_id: params.projectId
                    });
                    window.location.href = `/create?${formData.toString()}`;
                  } catch (error) {
                    console.error('Error creating form:', error);
                  }
                }}
                projectContext={knowledgeBase}
                projectName={project?.name}
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
    <AuthGuard 
      allowedRoles={['super_admin', 'project_admin', 'team_member']}
      redirectTo="/auth/login"
    >
      <AdminProjectPageContent />
    </AuthGuard>
  );
}