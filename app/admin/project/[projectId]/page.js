'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';
import useEscapeKey from '@/hooks/useEscapeKey';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import UserAvatar from '@/components/UserAvatar';
import FormResponseModal from '@/components/FormResponseModal';
import PaletteResultsModal from '@/components/PaletteResultsModal';
import CopyCollectionViewModal from '@/components/CopyCollectionViewModal';
import PhaseReviewResponseViewer from '@/components/PhaseReviewResponseViewer';
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
  Edit2,
  GripVertical,
  Settings,
  Copy,
  Bell,
  ExternalLink,
  BarChart,
  Star,
  Map,
  Download,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAndExportFormResponses } from '@/lib/csvExportUtils';
import LoadingSpinner from '@/components/LoadingSpinner';

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

// Dynamically import Create from Sitemap Modal
const CreateFromSitemapModal = dynamic(() => import('@/components/CreateFromSitemapModal'), {
  ssr: false
});

// Dynamically import Template Modals
const SaveTemplateModal = dynamic(() => import('@/components/SaveTemplateModal'), {
  ssr: false
});

const LoadTemplateModal = dynamic(() => import('@/components/LoadTemplateModal'), {
  ssr: false
});

// Dynamically import Link Submission Config
const LinkSubmissionConfig = dynamic(() => import('@/components/LinkSubmissionConfig'), {
  ssr: false
});

// Dynamically import File Upload Config with Selector
const FileUploadConfig = dynamic(() => import('@/components/FileUploadConfigWithSelector'), {
  ssr: false
});

// Dynamically import Phase Review Components
const PhaseReviewConfig = dynamic(() => import('@/components/PhaseReviewConfig'), {
  ssr: false
});

const PhaseReviewInlineDisplay = dynamic(() => import('@/components/PhaseReviewInlineDisplay'), {
  ssr: false
});

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item) {
      return false;
    }
    const id = item.id ?? item.applet_id ?? item.projectlet_id;
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
};

// Dynamically import Enhanced File Repository
const EnhancedFileRepository = dynamic(() => import('@/components/EnhancedFileRepository'), {
  ssr: false
});

// Dynamically import SortableProjectlet
const SortableProjectlet = dynamic(() => import('@/components/SortableProjectlet'), {
  ssr: false
});

// Dynamically import SortableApplet for nested drag-and-drop
const SortableApplet = dynamic(() => import('@/components/SortableApplet'), {
  ssr: false
});

// Dynamically import SitemapBuilder for viewing user submissions
const SitemapBuilder = dynamic(() => import('@/components/SitemapBuilderV2'), {
  ssr: false
});

// Dynamically import Project Insights Chat
const ProjectInsightsChat = dynamic(() => import('@/components/ProjectInsightsChat'), {
  ssr: false
});

// Dynamically import Chat Interface
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false
});

function AdminProjectPageContent() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [projectlets, setProjectlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading project');
  const [editingProjectlet, setEditingProjectlet] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableForms, setAvailableForms] = useState([]);
  const [projectForms, setProjectForms] = useState([]);
  const [showProjectletEditor, setShowProjectletEditor] = useState(false);
  const [selectedProjectlet, setSelectedProjectlet] = useState(null);
  const [showFormsSection, setShowFormsSection] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [projectKnowledgeCount, setProjectKnowledgeCount] = useState(0);
  const [knowledgePendingChanges, setKnowledgePendingChanges] = useState({});
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [selectedProjectlets, setSelectedProjectlets] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [lastFileUpdate, setLastFileUpdate] = useState(null);
  const [showKnowledgeUpload, setShowKnowledgeUpload] = useState(false);
  const [uploadingKnowledge, setUploadingKnowledge] = useState(false);
  const [projectletApplets, setProjectletApplets] = useState({}); // Store applets for each projectlet
  const [loadingApplets, setLoadingApplets] = useState({});
  const [editingProjectletName, setEditingProjectletName] = useState(null);
  const [tempProjectletName, setTempProjectletName] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [isDraggingApplet, setIsDraggingApplet] = useState(false);
  const [draggedAppletInfo, setDraggedAppletInfo] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [dropTargetProjectletId, setDropTargetProjectletId] = useState(null);
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
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showCreateFromSitemapModal, setShowCreateFromSitemapModal] = useState(false);
  const [selectedTemplateProjectlet, setSelectedTemplateProjectlet] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const [selectedTeamUserId, setSelectedTeamUserId] = useState('');
  const [selectedProjectRole, setSelectedProjectRole] = useState('team_member');
  const [stakeholderFormData, setStakeholderFormData] = useState({
    name: '',
    email: '',
    title: '',
    role: 'client_admin',
    phone: '',
    bio: '',
    responsibilities: '',
    preferences: '',
    linkedin_url: '',
    importance: 5,
    is_primary: false
  });
  const narrativeLengthOptions = [
    { value: 'succinct', label: 'Succinct (≈300 words)', helper: 'Great for short hooks and simple landing pages.' },
    { value: 'balanced', label: 'Balanced (≈600-900 words)', helper: 'Solid default for most marketing or feature pages.' },
    { value: 'comprehensive', label: 'Comprehensive (≈1200+ words)', helper: 'Best for deep-dives, technical detail, or long-form assets.' }
  ];
  const pageTypeGuides = [
    { value: 'homepage', label: 'Homepage — Hook & Direct (300-600 words)', helper: 'Clarity and scannability. Instant value proposition.' },
    { value: 'technology', label: 'Technology Page — Establish Credibility (800-2000+ words)', helper: 'Structured detail, link to assets, emphasize proof.' },
    { value: 'use_case', label: 'Use Cases Page — Show Business Value (400-800 words)', helper: 'Problem → Solution → Benefit written in customer language.' },
    { value: 'about', label: 'About Us — Build Trust (400-700 words)', helper: 'Highlight team expertise, credentials, milestones.' },
    { value: 'blog', label: 'Blog / Resources — Thought Leadership (1500-3000+ words)', helper: 'Long-form insight to demonstrate depth and support SEO.' }
  ];
  const [projectFileCount, setProjectFileCount] = useState(0);
  const [showFormResponseModal, setShowFormResponseModal] = useState(false);
  const [selectedResponseData, setSelectedResponseData] = useState({
    formId: null,
    userId: null,
    userName: null,
    formName: null
  });
  const [showPaletteResultsModal, setShowPaletteResultsModal] = useState(false);
  const [selectedPaletteData, setSelectedPaletteData] = useState({
    userName: null,
    responseData: null
  });
  const [showSitemapViewerModal, setShowSitemapViewerModal] = useState(false);
  const [selectedSitemapData, setSelectedSitemapData] = useState({
    userName: null,
    userEmail: null,
    sitemapData: null,
    submittedAt: null,
    appletName: null,
    projectScope: null,
    websiteUrl: null,
    appletId: null
  });
  const [showToneOfVoiceModal, setShowToneOfVoiceModal] = useState(false);
  const [selectedToneData, setSelectedToneData] = useState({
    userName: null,
    selectedTone: null,
    submittedAt: null
  });
  const [showClientReviewModal, setShowClientReviewModal] = useState(false);
  const [showCopyCollectionModal, setShowCopyCollectionModal] = useState(false);
  const [selectedCopyCollectionData, setSelectedCopyCollectionData] = useState(null);
  const [showPhaseReviewModal, setShowPhaseReviewModal] = useState(false);
  const [selectedPhaseReviewData, setSelectedPhaseReviewData] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedClientReviewData, setSelectedClientReviewData] = useState({
    userName: null,
    status: null,
    revisionNotes: null,
    revisionCount: 0,
    approvedAt: null,
    revisionRequestedAt: null,
    appletName: null
  });
  const [showAIReportEditor, setShowAIReportEditor] = useState(false);
  const [editingAIReport, setEditingAIReport] = useState(null);
  const [showNarrativeEditor, setShowNarrativeEditor] = useState(false);
  const [editingNarrativeApplet, setEditingNarrativeApplet] = useState(null);
  const [editingProjectInfo, setEditingProjectInfo] = useState(false);
  const [tempProjectInfo, setTempProjectInfo] = useState({
    project_type: '',
    website_url: '',
    scope: {
      main_pages: 5,
      aux_pages: 5,
      description: ''
    }
  });

  // Collapsible sections state - initialize from localStorage
  const [knowledgeBaseCollapsed, setKnowledgeBaseCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    projectInfo: false,
    fileRepository: false,
    clientReferences: false
  });
  const [clientReferences, setClientReferences] = useState([]);
  const [editingReferences, setEditingReferences] = useState(false);
  const [tempReferences, setTempReferences] = useState([]);

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
      role: 'client_admin',
      phone: '',
      bio: '',
      responsibilities: '',
      preferences: '',
      linkedin_url: '',
      importance: 5,
      is_primary: false
    });
  }, showStakeholderForm);

  useEscapeKey(() => {
    setShowTeamMemberModal(false);
    setSelectedTeamUserId('');
    setSelectedProjectRole('team_member');
  }, showTeamMemberModal);

  // Add ESC key handler for Knowledge Upload modal
  useEscapeKey(() => {
    setShowKnowledgeUpload(false);
  }, showKnowledgeUpload);

  // Add ESC key handler for Applet Manager modal
  useEscapeKey(() => {
    setShowAppletManager(false);
    setSelectedProjectletForApplet(null);
  }, showAppletManager);

  // Add ESC key handler for AI Form Builder modal
  useEscapeKey(() => {
    setShowAIFormBuilder(false);
  }, showAIFormBuilder);

  useEffect(() => {
    fetchProjectData();
    fetchKnowledgeBase();
    fetchStakeholders();
    fetchAvailableUsers();
    fetchProjectFileCount();
    fetchCurrentUser();
    fetchUnreadCount();

    // Progressive loading message
    const loadingTimer = setTimeout(() => {
      setLoadingMessage('Loading project details');
    }, 1500);

    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(loadingTimer);
    };
  }, [params.projectId]);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const storageKey = `project-${params.projectId}-knowledge-collapse`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setKnowledgeBaseCollapsed(parsed.mainCollapsed || false);
        setCollapsedSections(parsed.sections || {
          projectInfo: false,
          fileRepository: false,
          clientReferences: false
        });
      } catch (e) {
        console.error('Error loading collapsed state:', e);
      }
    }
  }, [params.projectId]);

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    const storageKey = `project-${params.projectId}-knowledge-collapse`;
    const stateToSave = {
      mainCollapsed: knowledgeBaseCollapsed,
      sections: collapsedSections
    };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  }, [knowledgeBaseCollapsed, collapsedSections, params.projectId]);

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

  // Handle ESC key to close all modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        // Close all modals when ESC is pressed
        setShowFormBuilderModal(false);
        setShowTeamMemberModal(false);
        setShowFormResponseModal(false);
        setShowPaletteResultsModal(false);
        setShowSitemapViewerModal(false);
        setShowToneOfVoiceModal(false);
        setShowClientReviewModal(false);
        setShowCopyCollectionModal(false);
        setShowChatModal(false);
        setSelectedResponseData(null);
        setSelectedPaletteData(null);
        setSelectedSitemapData(null);
        setSelectedToneData(null);
        setSelectedClientReviewData(null);
        setSelectedCopyCollectionData(null);
        setShowActionMenu(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  const fetchProjectFileCount = async () => {
    try {
      const response = await fetch(`/api/project-files?project_id=${params.projectId}`);
      if (response.ok) {
        const result = await response.json();
        // Handle both response formats
        const files = result.files || result;
        setProjectFileCount(Array.isArray(files) ? files.length : 0);

        // Find the most recent file update
        if (Array.isArray(files) && files.length > 0) {
          const mostRecent = files.reduce((latest, file) => {
            const fileDate = new Date(file.updated_at || file.created_at);
            return !latest || fileDate > latest ? fileDate : latest;
          }, null);
          setLastFileUpdate(mostRecent);
        }
      }
    } catch (error) {
      // Silently handle file count fetch error
    }
  };

  const fetchKnowledgeBase = async () => {
    try {
      // Fetch legacy knowledge base info
      const response = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`);
      const data = await response.json();

      // If knowledge base doesn't have a URL but project does, initialize it
      if (!data.project?.existing_url && project?.metadata?.website_url) {
        data.project = {
          ...data.project,
          existing_url: project.metadata.website_url
        };
      }

      setKnowledgeBase(data);

      // Load client references from project metadata
      if (data.project?.client_references) {
        setClientReferences(data.project.client_references);
      }

      // Fetch new knowledge system count
      const knowledgeResponse = await fetch(`/api/project-knowledge/${params.projectId}`);
      if (knowledgeResponse.ok) {
        const knowledgeData = await knowledgeResponse.json();
        setProjectKnowledgeCount(knowledgeData.stats?.total || 0);
      } else {
        // Knowledge API failed, silently continue
      }
    } catch (error) {
      // Silently handle knowledge base fetch error
    }
  };

  const handleKnowledgeFieldChange = (field, value) => {
    // Track pending changes
    setKnowledgePendingChanges(prev => ({ ...prev, [field]: value }));

    // Update local state immediately for responsive UI
    setKnowledgeBase(prev => ({
      ...prev,
      project: {
        ...prev?.project,
        [field]: value
      }
    }));

    // Also handle client_references separately
    if (field === 'client_references') {
      setClientReferences(value);
    }
  };

  const handleKnowledgeSave = async () => {
    if (Object.keys(knowledgePendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setKnowledgeSaving(true);
    try {
      // Save to database
      const response = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledgePendingChanges)
      });

      if (response.ok) {
        toast.success('Knowledge base saved successfully');

        // If website URL was updated, also update project metadata
        if (knowledgePendingChanges.existing_url !== undefined) {
          await fetch(`/api/aloa-projects/${params.projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                ...project?.metadata,
                website_url: knowledgePendingChanges.existing_url
              }
            })
          });
          // Refresh project data to sync URL
          fetchProjectData();
        }

        // Trigger AI knowledge extraction for the changes
        if (knowledgePendingChanges.base_knowledge || knowledgePendingChanges.existing_url) {
          await fetch(`/api/project-knowledge/${params.projectId}/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceType: 'project_metadata'
            })
          });
        }

        // Clear pending changes
        setKnowledgePendingChanges({});
        fetchKnowledgeBase();
      } else {
        toast.error('Failed to save knowledge base');
      }
    } catch (error) {
      toast.error('Error saving knowledge base');
    } finally {
      setKnowledgeSaving(false);
    }
  };

  const handleKnowledgeUpdate = async (field, value) => {
    // Keep for backward compatibility with other parts that may use it
    handleKnowledgeFieldChange(field, value);
  };

  const handleFileUpload = async (file) => {
    setUploadingKnowledge(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', params.projectId);

    try {
      // Upload file to project-files endpoint
      const uploadResponse = await fetch('/api/project-files', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error('Failed to upload file');
      }

      const { url, id } = await uploadResponse.json();

      // Add to knowledge base
      const knowledgeResponse = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'file',
          title: file.name,
          file_url: url,
          importance: 7
        })
      });

      if (knowledgeResponse.ok) {
        toast.success('File added to knowledge base');
        fetchKnowledgeBase();
        setShowKnowledgeUpload(false);
      }
    } catch (error) {
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
      // Silently handle stakeholder fetch error
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`/api/chat/${params.projectId}/unread`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/auth/users');

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      // Set all users - we'll filter them where they're used
      setAvailableUsers(data.users || []);
    } catch (error) {
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
          role: 'client_admin',
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
      // Silently handle applet fetch error
    } finally {
      setLoadingApplets(prev => ({ ...prev, [projectletId]: false }));
    }
  };

  const fetchProjectForms = async () => {
    try {
      const formsRes = await fetch(`/api/aloa-forms?project=${params.projectId}`);
      const formsData = await formsRes.json();

      // Handle both response formats: { forms: [...] } or direct array
      const forms = Array.isArray(formsData) ? formsData :
                    (formsData?.forms && Array.isArray(formsData.forms)) ? formsData.forms :
                    [];

      setAvailableForms(forms);
      setProjectForms(forms);
    } catch (error) {
      console.error('Error fetching project forms:', error);
      // Set empty arrays on error to prevent undefined issues
      setAvailableForms([]);
      setProjectForms([]);
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
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `Failed to ${action} form`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedTeamUserId || !selectedProjectRole) {
      toast.error('Please select a user and role');
      return;
    }

    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedTeamUserId,
          project_role: selectedProjectRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers([...teamMembers, data.member]);
        setShowTeamMemberModal(false);
        setSelectedTeamUserId('');
        setSelectedProjectRole('team_member');
        toast.success('Team member added successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add team member');
      }
    } catch (error) {
      toast.error('Failed to add team member');
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/aloa-projects/${params.projectId}/team?memberId=${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== memberId));
        toast.success('Team member removed successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove team member');
      }
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const handleAppletDrop = async (appletId, sourceProjectletId, targetProjectletId, targetIndex) => {
    try {
      // Get the source applets list
      const sourceApplets = projectletApplets[sourceProjectletId] || [];
      const targetApplets = projectletApplets[targetProjectletId] || [];

      // Find the dragged applet
      const draggedApplet = sourceApplets.find(a => a.id === appletId);
      if (!draggedApplet) return;

      // Calculate new order indices
      let updatedApplets = [];

      if (sourceProjectletId === targetProjectletId) {
        // Reordering within the same projectlet
        const currentIndex = sourceApplets.findIndex(a => a.id === appletId);
        if (currentIndex === targetIndex || currentIndex === targetIndex - 1) {
          // No change needed if dropping in the same position
          return;
        }

        // Remove from current position
        const newApplets = [...sourceApplets];
        newApplets.splice(currentIndex, 1);

        // Insert at new position
        const adjustedIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
        newApplets.splice(adjustedIndex, 0, draggedApplet);

        // Update order indices for all applets
        updatedApplets = newApplets.map((applet, index) => ({
          id: applet.id,
          order_index: index
        }));

        // Update local state immediately for better UX
        setProjectletApplets(prev => ({
          ...prev,
          [sourceProjectletId]: newApplets.map((applet, index) => ({
            ...applet,
            order_index: index
          }))
        }));
      } else {
        // Moving between projectlets
        // Remove from source
        const newSourceApplets = sourceApplets.filter(a => a.id !== appletId);

        // Insert into target
        const newTargetApplets = [...targetApplets];
        newTargetApplets.splice(targetIndex, 0, { ...draggedApplet, projectlet_id: targetProjectletId });

        // Update order indices for source projectlet
        const sourceUpdates = newSourceApplets.map((applet, index) => ({
          id: applet.id,
          order_index: index
        }));

        // Update order indices for target projectlet
        const targetUpdates = newTargetApplets.map((applet, index) => ({
          id: applet.id,
          order_index: index
        }));

        // Update local state immediately for both projectlets
        setProjectletApplets(prev => ({
          ...prev,
          [sourceProjectletId]: newSourceApplets.map((applet, index) => ({
            ...applet,
            order_index: index
          })),
          [targetProjectletId]: newTargetApplets.map((applet, index) => ({
            ...applet,
            order_index: index
          }))
        }));

        // Update the applet's projectlet_id
        const response = await fetch(
          `/api/aloa-projects/${params.projectId}/projectlets/${sourceProjectletId}/applets/${appletId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectlet_id: targetProjectletId,
              order_index: targetIndex
            })
          }
        );

        if (response.ok) {
          // Update both source and target applets
          if (sourceUpdates.length > 0) {
            await fetch(
              `/api/aloa-projects/${params.projectId}/projectlets/${sourceProjectletId}/applets/reorder`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applets: sourceUpdates })
              }
            );
          }

          if (targetUpdates.length > 1) {
            await fetch(
              `/api/aloa-projects/${params.projectId}/projectlets/${targetProjectletId}/applets/reorder`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applets: targetUpdates })
              }
            );
          }

          // Don't need to refetch since we already updated local state
          toast.success('Applet moved successfully');
        }
        return;
      }

      // For same projectlet reordering
      const response = await fetch(
        `/api/aloa-projects/${params.projectId}/projectlets/${sourceProjectletId}/applets/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applets: updatedApplets })
        }
      );

      if (response.ok) {
        // Don't need to refetch since we already updated local state
        toast.success('Applet reordered successfully');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to reorder applet');
        // Revert local state on error
        fetchProjectletApplets(sourceProjectletId);
      }
    } catch (error) {
      toast.error('Failed to reorder applet');
    }
  };

  const fetchProjectData = async () => {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/aloa-projects/${params.projectId}`);
      const projectData = await projectRes.json();
      setProject(projectData);

      // Initialize project info from metadata
      if (projectData?.metadata) {
        setTempProjectInfo({
          project_type: projectData.metadata.project_type || 'Website Design',
          scope: {
            main_pages: projectData.metadata.scope?.main_pages || projectData.rules?.main_pages || 5,
            aux_pages: projectData.metadata.scope?.aux_pages || projectData.rules?.aux_pages || 5,
            description: projectData.metadata.scope?.description || 'Standard website package'
          }
        });
      }

      // Fetch projectlets
      const projectletsRes = await fetch(`/api/aloa-projects/${params.projectId}/projectlets`);
      const projectletsData = await projectletsRes.json();
      setProjectlets(dedupeById(projectletsData.projectlets || []));
      // Clear selection when refreshing
      setSelectedProjectlets(new Set());
      setShowBulkActions(false);
      
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

        // Fetch completion data for each applet with rate limiting
        // Process applets in batches of 3 with a delay to avoid rate limiting
        const appletsWithCompletions = [];
        const batchSize = 3;
        const delayMs = 200; // 200ms delay between batches

        for (let i = 0; i < (data.applets || []).length; i += batchSize) {
          const batch = (data.applets || []).slice(i, i + batchSize);

          const batchResults = await Promise.all(
            batch.map(async (applet) => {
              try {
                const completionRes = await fetch(
                  `/api/aloa-projects/${params.projectId}/applet-completions?appletId=${applet.id}`
                );
                if (completionRes.ok) {
                  const completionData = await completionRes.json();
                  const enrichedApplet = {
                    ...applet,
                    completions: completionData.completions || [],
                    completion_percentage: completionData.percentage || 0,
                    totalStakeholders: completionData.totalStakeholders || 0,
                    completedCount: completionData.completedCount || 0
                  };
                  return enrichedApplet;
                } else if (completionRes.status === 429) {
                  // Rate limited, returning without completion data
                  return applet;
                } else {
                  // Failed to fetch completion data
                }
              } catch (error) {
                // Error fetching completion data
              }
              return applet;
            })
          );

          appletsWithCompletions.push(...batchResults);

          // Add delay between batches to avoid rate limiting
          if (i + batchSize < (data.applets || []).length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
        
        const sanitizedApplets = dedupeById(appletsWithCompletions);

        setProjectletApplets(prev => ({
          ...prev,
          [projectletId]: sanitizedApplets
        }));
      } else {
        // Failed to fetch applets
      }
    } catch (error) {
      // Silently handle applet fetch error
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
        const result = await response.json();
        // Show success feedback
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        // Refresh projectlets
        fetchProjectData();
      } else {
        const errorData = await response.text();
        // Failed to update status
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
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
      toast.error('Failed to delete projectlet');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjectlets.size === 0) {
      toast.error('No projectlets selected');
      return;
    }

    const count = selectedProjectlets.size;
    if (!confirm(`Are you sure you want to delete ${count} projectlet${count > 1 ? 's' : ''}? This will also delete all applets within them.`)) {
      return;
    }

    try {
      // Delete projectlets one by one
      const deletePromises = Array.from(selectedProjectlets).map(projectletId =>
        fetch(
          `/api/aloa-projects/${params.projectId}/projectlets?projectletId=${projectletId}`,
          { method: 'DELETE' }
        )
      );

      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
      const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.ok)).length;

      if (successCount > 0) {
        toast.success(`${successCount} projectlet${successCount > 1 ? 's' : ''} deleted`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} projectlet${failCount > 1 ? 's' : ''}`);
      }

      // Clear selection and refresh
      setSelectedProjectlets(new Set());
      setShowBulkActions(false);
      fetchProjectData();
    } catch (error) {
      toast.error('Failed to delete projectlets');
    }
  };

  const toggleProjectletSelection = (projectletId) => {
    const newSelection = new Set(selectedProjectlets);
    if (newSelection.has(projectletId)) {
      newSelection.delete(projectletId);
    } else {
      newSelection.add(projectletId);
    }
    setSelectedProjectlets(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const selectAllProjectlets = () => {
    if (selectedProjectlets.size === projectlets.length) {
      // Deselect all
      setSelectedProjectlets(new Set());
      setShowBulkActions(false);
    } else {
      // Select all
      setSelectedProjectlets(new Set(projectlets.map(p => p.id)));
      setShowBulkActions(true);
    }
  };

  const saveProjectInfo = async () => {
    try {
      const updatedMetadata = {
        ...project.metadata,
        project_type: tempProjectInfo.project_type,
        website_url: tempProjectInfo.website_url,
        scope: tempProjectInfo.scope
      };

      const response = await fetch(`/api/aloa-projects/${params.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: updatedMetadata })
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProject(updatedProject);
        setEditingProjectInfo(false);
        toast.success('Project information updated');

        // Also sync the URL to knowledge base if it was changed
        if (tempProjectInfo.website_url !== project?.metadata?.website_url) {
          await fetch(`/api/aloa-projects/${params.projectId}/knowledge`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ existing_url: tempProjectInfo.website_url })
          });
          fetchKnowledgeBase(); // Refresh knowledge base to show updated URL
        }
      } else {
        toast.error('Failed to update project information');
      }
    } catch (error) {
      toast.error('Failed to update project information');
    }
  };

  const startEditingProjectInfo = () => {
    setTempProjectInfo({
      project_type: project?.metadata?.project_type || 'Website Design',
      website_url: project?.metadata?.website_url || knowledgeBase?.project?.existing_url || '',
      scope: {
        main_pages: project?.metadata?.scope?.main_pages || project?.rules?.main_pages || 5,
        aux_pages: project?.metadata?.scope?.aux_pages || project?.rules?.aux_pages || 5,
        description: project?.metadata?.scope?.description || 'Standard website package'
      }
    });
    setEditingProjectInfo(true);
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
        setProjectlets(prevProjectlets => dedupeById([...prevProjectlets, projectlet]));
        // Initialize empty applets for the new projectlet
        setProjectletApplets(prev => ({
          ...prev,
          [projectlet.id]: []
        }));
        toast.success('Projectlet added successfully');
      } else {
        const error = await response.json();
        // Failed to create projectlet
        toast.error(error.error || 'Failed to add projectlet');
      }
    } catch (error) {
      toast.error('Failed to add projectlet');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Helper function to handle applet reordering API call
  const handleAppletReorder = async (projectletId, applets) => {
    try {
      const response = await fetch(
        `/api/aloa-projects/${params.projectId}/projectlets/${projectletId}/applets/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applets: applets.map((a, index) => ({
              id: a.id,
              order_index: index
            }))
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reorder applets');
      }
    } catch (error) {
      console.error('Error reordering applets:', error);
      toast.error('Failed to reorder applets');
      fetchProjectletApplets(projectletId); // Refresh applets on error
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Check if we're dragging an applet or a projectlet
    const activeData = active.data?.current;
    const overData = over.data?.current;

    if (activeData?.type === 'applet') {
      // Handle applet reordering
      const activeAppletId = active.id;
      const overAppletId = over.id;

      // Find which projectlet contains the active applet
      let sourceProjectletId = null;
      let targetProjectletId = null;
      let sourceApplets = [];
      let targetApplets = [];

      for (const projectlet of projectlets) {
        const applets = projectletApplets[projectlet.id] || [];
        if (applets.some(a => a.id === activeAppletId)) {
          sourceProjectletId = projectlet.id;
          sourceApplets = applets;
        }
        if (overData?.type === 'applet' && applets.some(a => a.id === overAppletId)) {
          targetProjectletId = projectlet.id;
          targetApplets = applets;
        }
      }

      if (!sourceProjectletId) {
        setActiveId(null);
        return;
      }

      // If dropping on another applet
      if (overData?.type === 'applet' && targetProjectletId) {
        const oldIndex = sourceApplets.findIndex(a => a.id === activeAppletId);
        const newIndex = targetApplets.findIndex(a => a.id === overAppletId);

        if (sourceProjectletId === targetProjectletId) {
          // Reordering within the same projectlet
          const newApplets = arrayMove(sourceApplets, oldIndex, newIndex);
          setProjectletApplets(prev => ({
            ...prev,
            [sourceProjectletId]: newApplets
          }));

          // Update in database
          await handleAppletReorder(sourceProjectletId, newApplets);
          toast.success('Applet order updated');
        } else {
          // Moving between projectlets - currently not supported
          toast.error('Moving applets between sections is not yet supported');
        }
      }
    } else {
      // Handle projectlet reordering (existing code)
      const oldIndex = projectlets.findIndex((p) => p.id === active.id);
      const newIndex = projectlets.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newProjectlets = arrayMove(projectlets, oldIndex, newIndex);
        setProjectlets(newProjectlets);

        // Update order in database
        try {
          const response = await fetch(
            `/api/aloa-projects/${params.projectId}/projectlets/reorder`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectletId: active.id,
                newIndex
              })
            }
          );

          if (response.ok) {
            toast.success('Order updated');
          } else {
            throw new Error('Failed to update order');
          }
        } catch (error) {
          toast.error('Failed to update order');
          fetchProjectData(); // Revert on error
        }
      }
    }

    setActiveId(null);
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
        <LoadingSpinner message={loadingMessage} size="default" />
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
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <button
            onClick={() => setKnowledgeBaseCollapsed(!knowledgeBaseCollapsed)}
            className="w-full p-6 hover:opacity-80 transition-opacity flex items-center justify-between"
          >
            <div className="flex items-center">
              <Brain className="w-6 h-6 mr-2 text-purple-600" />
              <h2 className="text-2xl font-bold">Project Knowledge Base</h2>
              {Object.keys(knowledgePendingChanges).length > 0 && (
                <span className="ml-3 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center">
              {Object.keys(knowledgePendingChanges).length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKnowledgeSave();
                  }}
                  disabled={knowledgeSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 mr-3">
                  <Save className="w-4 h-4" />
                  {knowledgeSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              {knowledgeBaseCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </button>

          {!knowledgeBaseCollapsed && knowledgeBase && (
            <div className="px-6 pb-6">
            <>
              {/* Project Information Section - Collapsible */}
              <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, projectInfo: !prev.projectInfo }))}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                >
                  <h3 className="text-lg font-semibold flex items-center">
                    <Database className="w-5 h-5 mr-2 text-purple-600" />
                    Project Information
                  </h3>
                  {collapsedSections.projectInfo ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {!collapsedSections.projectInfo && (
                  <div className="p-4">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline w-4 h-4 mr-1" />
                    Existing Website URL
                  </label>
                  <input
                    type="url"
                    value={knowledgeBase.project?.existing_url || project?.metadata?.website_url || ''}
                    onChange={(e) => handleKnowledgeFieldChange('existing_url', e.target.value)}
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
                    onChange={(e) => handleKnowledgeFieldChange('google_drive_url', e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                    </div>

                    {/* Base Knowledge */}
                    <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Database className="inline w-4 h-4 mr-1" />
                  Base Knowledge (Key Information)
                </label>
                <textarea
                  value={knowledgeBase.project?.base_knowledge?.notes || ''}
                  onChange={(e) => handleKnowledgeFieldChange('base_knowledge', { notes: e.target.value })}
                  placeholder="Enter key information about this project: brand guidelines, target audience, business goals, etc."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                    </div>

                    {/* Brand Colors Section */}
                    <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="inline w-4 h-4 mr-1" />
                  Brand Colors
                </label>
                <div className="space-y-3">
                  <p className="text-xs text-gray-600">
                    Add the client's existing brand colors here. These will automatically populate in the Palette Cleanser applet.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {(knowledgeBase.project?.brand_colors || []).map((color, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200">
                        <div
                          className="w-8 h-8 rounded border-2 border-gray-300"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-sm">{color}</span>
                        <button
                          onClick={() => {
                            const newColors = [...(knowledgeBase.project?.brand_colors || [])];
                            newColors.splice(index, 1);
                            handleKnowledgeFieldChange('brand_colors', newColors);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="#000000 or rgb(0,0,0)"
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target;
                          const color = input.value.trim();
                          if (color && color.match(/^#[0-9A-Fa-f]{6}$/)) {
                            const currentColors = knowledgeBase.project?.brand_colors || [];
                            if (currentColors.length < 5) {
                              handleKnowledgeFieldChange('brand_colors', [...currentColors, color.toUpperCase()]);
                              input.value = '';
                            } else {
                              toast.error('Maximum 5 colors allowed');
                            }
                          } else {
                            toast.error('Please enter a valid hex color (e.g., #FF5733)');
                          }
                        }
                      }}
                      id="brand-color-input"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('brand-color-input');
                        const color = input.value.trim();
                        if (color && color.match(/^#[0-9A-Fa-f]{6}$/)) {
                          const currentColors = knowledgeBase.project?.brand_colors || [];
                          if (currentColors.length < 5) {
                            handleKnowledgeFieldChange('brand_colors', [...currentColors, color.toUpperCase()]);
                            input.value = '';
                          } else {
                            toast.error('Maximum 5 colors allowed');
                          }
                        } else {
                          toast.error('Please enter a valid hex color (e.g., #FF5733)');
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Client References Section - New */}
              <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, clientReferences: !prev.clientReferences }))}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                >
                  <h3 className="text-lg font-semibold flex items-center">
                    <Link className="w-5 h-5 mr-2 text-purple-600" />
                    Client References
                  </h3>
                  {collapsedSections.clientReferences ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {!collapsedSections.clientReferences && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-600">Add URLs for client reference websites and inspiration</p>
                      {!editingReferences ? (
                        <button
                          onClick={() => {
                            setEditingReferences(true);
                            setTempReferences([...(clientReferences || [])]);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              // Update local state
                              handleKnowledgeFieldChange('client_references', tempReferences);
                              setEditingReferences(false);

                              // Save immediately to database
                              try {
                                const response = await fetch(`/api/aloa-projects/${params.projectId}/knowledge`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ client_references: tempReferences })
                                });

                                if (response.ok) {
                                  toast.success('Client references saved');
                                  // Clear pending changes for this field
                                  setKnowledgePendingChanges(prev => {
                                    const updated = { ...prev };
                                    delete updated.client_references;
                                    return updated;
                                  });
                                } else {
                                  toast.error('Failed to save client references');
                                }
                              } catch (error) {
                                toast.error('Error saving client references');
                              }
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingReferences(false);
                              setTempReferences([]);
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {editingReferences ? (
                      <div className="space-y-2">
                        {tempReferences.map((ref, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="url"
                              value={ref.url}
                              onChange={(e) => {
                                const newRefs = [...tempReferences];
                                newRefs[index] = { ...ref, url: e.target.value };
                                setTempReferences(newRefs);
                              }}
                              placeholder="https://example.com"
                              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <input
                              type="text"
                              value={ref.description || ''}
                              onChange={(e) => {
                                const newRefs = [...tempReferences];
                                newRefs[index] = { ...ref, description: e.target.value };
                                setTempReferences(newRefs);
                              }}
                              placeholder="Description (optional)"
                              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                              onClick={() => {
                                setTempReferences(tempReferences.filter((_, i) => i !== index));
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setTempReferences([...tempReferences, { url: '', description: '' }]);
                          }}
                          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Reference URL
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clientReferences && clientReferences.length > 0 ? (
                          clientReferences.map((ref, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <ExternalLink className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex-1 truncate"
                              >
                                {ref.url}
                              </a>
                              {ref.description && (
                                <span className="text-sm text-gray-600">- {ref.description}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 italic">No reference URLs added yet</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Repository Section - Collapsible */}
              <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, fileRepository: !prev.fileRepository }))}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                >
                  <h3 className="text-lg font-semibold flex items-center">
                    <FolderOpen className="w-5 h-5 mr-2 text-purple-600" />
                    Project File Repository
                  </h3>
                  {collapsedSections.fileRepository ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {!collapsedSections.fileRepository && (
                  <div className="p-4">
                    <div className="border border-gray-200 rounded-lg bg-gray-50">
                  <EnhancedFileRepository
                    projectId={params.projectId}
                    canUpload={true}
                    canDelete={true}
                    canCreateFolders={true}
                    onFileChange={() => {
                      fetchProjectFileCount();
                      fetchKnowledgeBase(); // Refresh knowledge count too
                    }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Legacy Knowledge Documents - Hidden (deprecated in favor of automatic extraction) */}

              {/* AI Insights - Hidden (part of legacy system) */}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{projectFileCount}</p>
                  <p className="text-sm text-gray-600">Files</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {projectKnowledgeCount}
                  </p>
                  <p className="text-sm text-gray-600">Knowledge Items</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {lastFileUpdate ? lastFileUpdate.toLocaleString() :
                     knowledgeBase?.stats?.lastUpdated ? new Date(knowledgeBase.stats.lastUpdated).toLocaleString() :
                     'Never'}
                  </p>
                </div>
              </div>
            </>
            </div>
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
                  role: 'client_admin',
                  phone: '',
                  bio: '',
                  responsibilities: '',
                  preferences: '',
                  linkedin_url: '',
                  importance_score: 5,
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
              {stakeholders.map((stakeholder, stakeholderIndex) => {
                if (!stakeholder) {
                  return null;
                }

                const stakeholderKey = stakeholder.id
                  ?? stakeholder.user_id
                  ?? `stakeholder-${stakeholderIndex}`;

                return (
                  <div key={stakeholderKey} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                        <div className="flex items-center gap-2 mb-2">
                          {stakeholder.is_primary && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">
                              Primary Contact
                            </span>
                          )}
                          {stakeholder.role && (
                            <span className="text-xs text-gray-500 capitalize">
                              {stakeholder.role === 'client_admin' ? 'Client Admin' : stakeholder.role === 'client_participant' ? 'Client Participant' : stakeholder.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg">{stakeholder.name}</h3>
                        {stakeholder.title && (
                          <p className="text-sm text-gray-600">{stakeholder.title}</p>
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
                            role: stakeholder.role || 'client_admin',
                            phone: stakeholder.phone || '',
                            bio: stakeholder.bio || '',
                            responsibilities: stakeholder.responsibilities || '',
                            preferences: stakeholder.preferences || '',
                            linkedin_url: stakeholder.linkedin_url || '',
                            importance_score: stakeholder.importance_score || stakeholder.importance || 5,
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
                    <a
                      href={`mailto:${stakeholder.email}`}
                      className="inline-flex items-center text-sm text-gray-600 hover:text-black mb-1 transition-colors"
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      {stakeholder.email}
                    </a>
                  )}
                  
                  {stakeholder.bio && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                      {stakeholder.bio}
                    </p>
                  )}
                  
                  {(stakeholder.importance_score || stakeholder.importance) && (
                    <div className="mt-2">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Importance:</span>
                        <div className="flex">
                          {[...Array(10)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < (stakeholder.importance_score || stakeholder.importance)
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
                );
              })}
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
                  {/* Bulk Actions */}
                  {showBulkActions && (
                    <div className="flex items-center gap-2 mr-2 p-2 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700 font-medium">
                        {selectedProjectlets.size} selected
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </button>
                    </div>
                  )}
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

                  {/* Template Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                      className="p-2 border rounded-lg hover:bg-gray-50"
                      title="Template options"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {showTemplateMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
                        <button
                          onClick={() => {
                            setShowLoadTemplateModal(true);
                            setShowTemplateMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Load Template
                        </button>
                        <button
                          onClick={() => {
                            setShowSaveTemplateModal(true);
                            setShowTemplateMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save All as Template
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            setShowCreateFromSitemapModal(true);
                            setShowTemplateMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                        >
                          <Map className="w-4 h-4 mr-2" />
                          Create from Sitemap
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Select All Checkbox */}
              {projectlets.length > 0 && (
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedProjectlets.size === projectlets.length && projectlets.length > 0}
                    onChange={selectAllProjectlets}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mr-3"
                  />
                  <label className="text-sm text-gray-600 font-medium cursor-pointer" onClick={selectAllProjectlets}>
                    Select All ({projectlets.length} projectlet{projectlets.length !== 1 ? 's' : ''})
                  </label>
                </div>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={projectlets.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {projectlets.map((projectlet, index) => {
                      if (!projectlet) {
                        return null;
                      }

                      const projectletKey = projectlet.id ?? `projectlet-${index}`;
                      const applets = dedupeById(projectletApplets[projectlet.id] || []);
                      const isLoadingApplets = loadingApplets[projectlet.id];
                      const isEditingName = editingProjectletName === projectlet.id;
                      const APPLET_ICONS = {
                        form: FileText,
                        review: Eye,
                        upload: Upload,
                        signoff: CheckCircle,
                        moodboard: Palette,
                        content_gather: MessageSquare,
                        sitemap: Map,
                        palette_cleanser: Palette,
                        link_submission: Link
                      };

                      return (
                        <SortableProjectlet
                          key={projectletKey}
                          id={projectlet.id}
                          isDragging={activeId !== null}
                        >
                          <div className={`border-2 rounded-lg ${getStatusColor(projectlet.status)} transition-all ${
                            selectedProjectlets.has(projectlet.id) ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                          }`}>
                            {/* Header */}
                            <div className="p-4 pb-0">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start flex-1">

                            {/* Checkbox */}
                            <div className="mr-3 mt-1">
                              <input
                                type="checkbox"
                                checked={selectedProjectlets.has(projectlet.id)}
                                onChange={() => toggleProjectletSelection(projectlet.id)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
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
                                  <button
                                    onClick={() => {
                                      setSelectedTemplateProjectlet(projectlet);
                                      setShowSaveTemplateModal(true);
                                      setShowActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save as Template
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
                          <div>
                            {/* Nested SortableContext for applets within this projectlet */}
                            <SortableContext
                              items={applets.map(a => a.id)}
                              strategy={verticalListSortingStrategy}
                            >
                            {applets.map((applet, appletIndex) => {
                              if (!applet) {
                                return null;
                              }

                              const appletKey = applet.id ?? `${projectletKey}-applet-${appletIndex}`;
                              const Icon = APPLET_ICONS[applet.type] || FileText;
                              const formId = applet.form_id || applet.config?.form_id;
                              const form = formId ? availableForms.find(f => f.id === formId) : null;
                              const isFormLocked = form?.status === 'closed';
                              const hasRejection = applet.type === 'client_review' && applet.form_progress?.status === 'revision_requested';

                              return (
                                <React.Fragment key={appletKey}>
                                  <SortableApplet
                                    id={applet.id}
                                    isDragging={activeId === applet.id}
                                  >
                                    <div
                                      className={`p-2 rounded transition-colors group border-2 ${
                                        hasRejection
                                          ? 'bg-orange-50 border-orange-300 hover:bg-orange-100 animate-pulse-subtle'
                                          : isFormLocked && applet.type === 'form'
                                          ? 'bg-red-50 border-red-300 hover:bg-red-100'
                                          : 'bg-white/50 border-transparent hover:bg-white/70'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 flex-1">
                                          <Icon className="w-4 h-4 text-gray-600" />
                                          <span className="text-sm font-medium">{applet.name}</span>
                                      {hasRejection && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-full animate-pulse">
                                          <AlertCircle className="w-3 h-3" />
                                          ACTION NEEDED
                                        </span>
                                      )}
                                      {/* Always show progress - even if 0 stakeholders to show 0/0 */}
                                      {(
                                        <div className="flex items-center space-x-2">
                                          <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full transition-all duration-300 ${
                                                applet.completion_percentage === 100 && applet.totalStakeholders > 0
                                                  ? 'bg-green-600'
                                                  : applet.completion_percentage > 0
                                                  ? 'bg-yellow-500'
                                                  : 'bg-gray-300'
                                              }`}
                                              style={{ width: `${applet.completion_percentage || 0}%` }}
                                            />
                                          </div>
                                          <span className={`text-xs font-medium ${
                                            applet.completion_percentage === 100 && applet.totalStakeholders > 0
                                              ? 'text-green-600'
                                              : 'text-gray-600'
                                          }`}>
                                            {applet.completedCount || 0}/{applet.totalStakeholders || 0}
                                          </span>
                                        </div>
                                      )}
                                      {isFormLocked && applet.type === 'form' && (
                                        <span className="text-xs px-2 py-0.5 bg-red-600 text-white rounded font-semibold uppercase">
                                          🔒 LOCKED
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {/* Show avatars of users who completed this applet */}
                                      {applet.completions && applet.completions.length > 0 && (
                                        <div className="flex items-center space-x-2">
                                          <div className="flex -space-x-2">
                                            {/* AI amalgamated view avatar for palette cleanser */}
                                            {(applet.type === 'palette_cleanser' || applet.name?.toLowerCase().includes('palette')) && applet.completions.length > 1 && (
                                              <div
                                                className="relative group cursor-pointer hover:scale-110 transition-transform"
                                                title="AI Amalgamated View - Click to see combined palette preferences"
                                                onClick={() => {
                                                  // Prepare amalgamated data from all completions
                                                  const amalgamatedData = {
                                                    participants: applet.completions.map(c => ({
                                                      name: c.user?.full_name || c.user?.email || 'User',
                                                      data: c.data
                                                    })),
                                                    isAmalgamated: true
                                                  };
                                                  setSelectedPaletteData({
                                                    userName: 'AI Amalgamated View',
                                                    responseData: amalgamatedData,
                                                    isAmalgamated: true
                                                  });
                                                  setShowPaletteResultsModal(true);
                                                }}
                                              >
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center ring-2 ring-white">
                                                  <Brain className="w-4 h-4 text-white" />
                                                </div>
                                              </div>
                                            )}
                                            {applet.completions.slice(0, 4).map((completion) => {
                                              const isInProgress = completion.status === 'in_progress';
                                              // Special handling for client_review applets
                                              const isClientReview = applet.type === 'client_review';
                                              const reviewStatus = isClientReview ? (completion.form_progress?.status || applet.form_progress?.status) : null;
                                              const isRejected = reviewStatus === 'revision_requested';
                                              const isApproved = reviewStatus === 'approved';

                                              // Special handling for phase_review applets
                                              const isPhaseReview = applet.type === 'phase_review';
                                              const phaseReviewDecision = isPhaseReview ? completion.form_progress?.reviewData?.decision : null;
                                              const isPhaseApproved = phaseReviewDecision === 'approve';
                                              const isPhaseRevise = phaseReviewDecision === 'revise';

                                              return (
                                                <div
                                                  key={completion.user_id}
                                                  className={`relative group ${(applet.type === 'form' || applet.type === 'palette_cleanser' || applet.type === 'sitemap' || applet.type === 'tone_of_voice' || applet.type === 'client_review' || applet.type === 'copy_collection' || applet.type === 'phase_review' || applet.name?.toLowerCase().includes('palette')) ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
                                                  title={`${completion.user?.full_name || completion.user?.email || 'User'} - ${
                                                    isClientReview && isRejected ? `⚠️ REVISION REQUESTED${completion.form_progress?.revision_notes ? ': ' + completion.form_progress.revision_notes : ''}` :
                                                    isClientReview && isApproved ? '✅ APPROVED' :
                                                    isInProgress ? 'In Progress' : `Reviewed ${
                                                      completion.completed_at ? new Date(completion.completed_at).toLocaleDateString() : ''
                                                    }`
                                                  }${applet.type === 'form' ? '\nClick to view response' : applet.type === 'sitemap' ? '\nClick to view sitemap' : applet.type === 'tone_of_voice' ? '\nClick to view tone selection' : applet.type === 'client_review' ? '\nClick to view review details' : applet.type === 'copy_collection' ? '\nClick to view copy submission' : applet.type === 'phase_review' ? '\nClick to view phase review' : (applet.type === 'palette_cleanser' || applet.name?.toLowerCase().includes('palette')) ? '\nClick to view palette preferences' : ''}`}
                                                onClick={async () => {
                                                  if (applet.type === 'form') {
                                                    const formId = applet.form_id || applet.config?.form_id;
                                                    const form = formId ? availableForms.find(f => f.id === formId) : null;
                                                    setSelectedResponseData({
                                                      formId: formId,
                                                      userId: completion.user_id,
                                                      userName: completion.user?.full_name || completion.user?.email || 'User',
                                                      formName: form?.title || applet.name
                                                    });
                                                    setShowFormResponseModal(true);
                                                  } else if (applet.type === 'sitemap') {
                                                    // Fetch the user's sitemap data
                                                    try {
                                                      const userEmail = completion.user?.email || completion.user_id;
                                                      const response = await fetch(
                                                        `/api/aloa-projects/${params.projectId}/applet-interactions?appletId=${applet.id}&userEmail=${userEmail}&type=sitemap_save`
                                                      );

                                                      if (response.ok) {
                                                        const data = await response.json();
                                                        const userSitemapData = data.interactions?.[0]?.data?.sitemap_data || applet.config?.sitemap_data;

                                                        setSelectedSitemapData({
                                                          userName: completion.user?.full_name || completion.user?.email || 'Unknown User',
                                                          userEmail: userEmail,
                                                          sitemapData: userSitemapData,
                                                          submittedAt: completion.completed_at || completion.started_at,
                                                          appletName: applet.name,
                                                          projectScope: project?.metadata?.scope || { main_pages: 5, aux_pages: 5 },
                                                          websiteUrl: project?.metadata?.website_url,
                                                          appletId: applet.id
                                                        });
                                                        setShowSitemapViewerModal(true);
                                                      } else {
                                                        // Response not ok
                                                        // Fallback to showing current applet config
                                                        setSelectedSitemapData({
                                                          userName: completion.user?.full_name || completion.user?.email || 'Unknown User',
                                                          userEmail: completion.user?.email || completion.user_id,
                                                          sitemapData: applet.config?.sitemap_data,
                                                          submittedAt: completion.completed_at || completion.started_at,
                                                          appletName: applet.name,
                                                          projectScope: project?.metadata?.scope || { main_pages: 5, aux_pages: 5 },
                                                          websiteUrl: project?.metadata?.website_url,
                                                          appletId: applet.id
                                                        });
                                                        setShowSitemapViewerModal(true);
                                                      }
                                                    } catch (error) {
                                                      // Error fetching user sitemap data
                                                      // Fallback to showing the current applet config
                                                      setSelectedSitemapData({
                                                        userName: completion.user?.full_name || completion.user?.email || 'Unknown User',
                                                        userEmail: completion.user?.email || completion.user_id,
                                                        sitemapData: applet.config?.sitemap_data,
                                                        submittedAt: completion.completed_at || completion.started_at,
                                                        appletName: applet.name,
                                                        projectScope: project?.metadata?.scope || { main_pages: 5, aux_pages: 5 },
                                                        websiteUrl: project?.metadata?.website_url,
                                                        appletId: applet.id
                                                      });
                                                      setShowSitemapViewerModal(true);
                                                    }
                                                  } else if (applet.type === 'palette_cleanser' || applet.name?.toLowerCase().includes('palette')) {
                                                    // Show palette results modal
                                                    setSelectedPaletteData({
                                                      userName: completion.user?.full_name || completion.user?.email || 'User',
                                                      responseData: completion.data || {}
                                                    });
                                                    setShowPaletteResultsModal(true);
                                                  } else if (applet.type === 'tone_of_voice') {
                                                    // Show tone of voice selection modal
                                                    // Check both form_progress (standardized) and data (legacy) fields
                                                    const toneData = completion.form_progress || completion.data || {};
                                                    setSelectedToneData({
                                                      userName: completion.user?.full_name || completion.user?.email || 'User',
                                                      selectedTone: toneData.selectedTone || toneData.tone || null,
                                                      educationLevel: toneData.educationLevel || null,
                                                      submittedAt: completion.completed_at || completion.started_at
                                                    });
                                                    setShowToneOfVoiceModal(true);
                                                  } else if (applet.type === 'client_review') {
                                                    // Show client review details modal
                                                    const reviewData = completion.form_progress || applet.form_progress || {};
                                                    setSelectedClientReviewData({
                                                      userName: completion.user?.full_name || completion.user?.email || 'Client Admin',
                                                      status: reviewData.status,
                                                      revisionNotes: reviewData.revision_notes,
                                                      revisionCount: reviewData.revision_count || 0,
                                                      approvedAt: reviewData.approved_at,
                                                      revisionRequestedAt: reviewData.revision_requested_at,
                                                      appletName: applet.name
                                                    });
                                                    setShowClientReviewModal(true);
                                                  } else if (applet.type === 'copy_collection') {
                                                    // Show copy collection modal
                                                    setSelectedCopyCollectionData({
                                                      appletProgress: completion,
                                                      stakeholder: completion.user,
                                                      appletName: applet.name
                                                    });
                                                    setShowCopyCollectionModal(true);
                                                  } else if (applet.type === 'phase_review') {
                                                    // Show phase review modal
                                                    const reviewData = completion.form_progress?.reviewData || {};
                                                    setSelectedPhaseReviewData({
                                                      response: reviewData,
                                                      userName: completion.user?.full_name || completion.user?.email || 'User',
                                                      appletName: applet.name
                                                    });
                                                    setShowPhaseReviewModal(true);
                                                  }
                                                }}
                                              >
                                                  {completion.user?.avatar_url ? (
                                                    <img
                                                      src={completion.user.avatar_url}
                                                      alt={completion.user.full_name || ''}
                                                      className={`w-7 h-7 rounded-full object-cover ring-2 ${
                                                        isClientReview && isRejected ? 'ring-orange-500 ring-4' :
                                                        isClientReview && isApproved ? 'ring-green-500 ring-4' :
                                                        isPhaseReview && isPhaseRevise ? 'ring-orange-500 ring-4' :
                                                        isPhaseReview && isPhaseApproved ? 'ring-green-500 ring-4' :
                                                        isInProgress ? 'ring-gray-400 ring-dashed opacity-80' : 'ring-white'
                                                      }`}
                                                    />
                                                  ) : (
                                                    <div className={`w-7 h-7 rounded-full ${
                                                      isClientReview && isRejected ? 'bg-orange-500' :
                                                      isClientReview && isApproved ? 'bg-green-500' :
                                                      isPhaseReview && isPhaseRevise ? 'bg-orange-500' :
                                                      isPhaseReview && isPhaseApproved ? 'bg-green-500' :
                                                      'bg-purple-500'
                                                    } flex items-center justify-center text-white text-xs font-medium ring-2 ${
                                                      isClientReview && isRejected ? 'ring-orange-500 ring-4' :
                                                      isClientReview && isApproved ? 'ring-green-500 ring-4' :
                                                      isPhaseReview && isPhaseRevise ? 'ring-orange-500 ring-4' :
                                                      isPhaseReview && isPhaseApproved ? 'ring-green-500 ring-4' :
                                                      isInProgress ? 'ring-gray-400 ring-dashed opacity-80' : 'ring-white'
                                                    }`}>
                                                      {(completion.user?.full_name || completion.user?.email || '?')[0].toUpperCase()}
                                                    </div>
                                                  )}
                                                  {/* Warning badge for rejected reviews */}
                                                  {isClientReview && isRejected && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                                      <span className="text-white text-xs font-bold">!</span>
                                                    </div>
                                                  )}
                                                  {/* Checkmark badge for approved reviews */}
                                                  {isClientReview && isApproved && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                      <CheckCircle className="w-3 h-3 text-white" />
                                                    </div>
                                                  )}
                                                  {/* Warning badge for phase review revisions */}
                                                  {isPhaseReview && isPhaseRevise && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                                      <span className="text-white text-xs font-bold">!</span>
                                                    </div>
                                                  )}
                                                  {/* Checkmark badge for approved phase reviews */}
                                                  {isPhaseReview && isPhaseApproved && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                      <CheckCircle className="w-3 h-3 text-white" />
                                                    </div>
                                                  )}
                                              </div>
                                              );
                                            })}
                                            {applet.completions.length > 4 && (
                                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 ring-2 ring-white">
                                                +{applet.completions.length - 4}
                                              </div>
                                            )}
                                          </div>
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

                                  {/* Applet Configuration Section */}
                                  <div>
                                  {/* Inline sitemap configuration for sitemap applets */}
                                  {expandedApplets[applet.id] && applet.type === 'sitemap' && (
                                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="text-sm font-medium text-gray-700">Sitemap Configuration</div>

                                      {/* Display project scope information */}
                                      <div className="text-xs text-gray-600">
                                        <div>Project Type: {project?.metadata?.project_type || 'Website Design'}</div>
                                        <div>
                                          Scope: {project?.metadata?.scope?.main_pages || 5} main pages, {' '}
                                          {project?.metadata?.scope?.aux_pages || 5} auxiliary pages
                                        </div>
                                      </div>

                                      {/* Lock/Unlock toggle */}
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">
                                          {applet.config?.locked ? 'Locked (View Only)' : 'Unlocked (Editable)'}
                                        </span>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      locked: !applet.config?.locked
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success(applet.config?.locked ? 'Sitemap unlocked' : 'Sitemap locked');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update lock status');
                                            }
                                          }}
                                          className={`px-3 py-1 rounded text-sm font-medium ${
                                            applet.config?.locked
                                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                                          }`}
                                        >
                                          {applet.config?.locked ? (
                                            <>
                                              <Lock className="w-3 h-3 inline mr-1" />
                                              Unlock
                                            </>
                                          ) : (
                                            <>
                                              <Unlock className="w-3 h-3 inline mr-1" />
                                              Lock
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      {/* Instructions */}
                                      <div>
                                        <label className="text-xs text-gray-500">Instructions for clients:</label>
                                        <textarea
                                          value={applet.config?.instructions || 'Build your website sitemap by organizing pages and their relationships'}
                                          onChange={async (e) => {
                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      instructions: e.target.value
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                              }
                                            } catch (error) {
                                            }
                                          }}
                                          className="w-full mt-1 px-2 py-1 border rounded text-sm"
                                          rows="2"
                                        />
                                      </div>
                                    </div>
                                  )}

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
                                              }
                                            }
                                          }}
                                          className="flex-1 max-w-xs text-sm px-2 py-1 border rounded bg-white"
                                        >
                                          <option value="">Select a form...</option>
                                          <option value="create_new">✨ Create New Form with AI</option>
                                          {availableForms
                                            .filter((form) => form?.id)
                                            .map((form, formIndex) => {
                                              const optionKey = form.id
                                                ?? form.urlId
                                                ?? form.url_id
                                                ?? `available-form-${formIndex}`;

                                              return (
                                                <option key={optionKey} value={form.id}>
                                                  {form.title}
                                                </option>
                                              );
                                            })}
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
                                                  <button
                                                    onClick={async () => {
                                                      const exported = await fetchAndExportFormResponses(formId, form.title);
                                                      if (exported) {
                                                        toast.success('Responses exported successfully');
                                                      } else if (form.response_count === 0) {
                                                        toast.error('No responses to export');
                                                      } else {
                                                        toast.error('Failed to export responses');
                                                      }
                                                    }}
                                                    className="p-1 hover:bg-green-100 rounded transition-colors"
                                                    title="Export Responses as CSV"
                                                  >
                                                    <Download className="w-4 h-4 text-green-600" />
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

                                  {/* Inline copy collection configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'copy_collection' && (
                                    <div className="mt-2">
                                      <div className="space-y-3">

                                        {/* Form selector for fallback option */}
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Form for Copy Generation (if user chooses form option)
                                          </label>
                                          <select
                                            value={applet.config?.formId || ''}
                                            onChange={async (e) => {
                                              if (e.target.value === 'create_new') {
                                                setShowFormBuilderModal(true);
                                                setFormBuilderContext({
                                                  projectletId: projectlet.id,
                                                  projectletName: projectlet.name
                                                });
                                              } else {
                                                try {
                                                  const response = await fetch(
                                                    `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                    {
                                                      method: 'PATCH',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({
                                                        config: {
                                                          ...applet.config,
                                                          formId: e.target.value
                                                        }
                                                      })
                                                    }
                                                  );
                                                  if (response.ok) {
                                                    fetchProjectletApplets(projectlet.id);
                                                  }
                                                } catch (error) {
                                                  console.error('Error updating form:', error);
                                                }
                                              }
                                            }}
                                            className="w-full text-sm px-2 py-1 border rounded bg-white"
                                          >
                                            <option value="">No form selected...</option>
                                            <option value="create_new">✨ Create New Form with AI</option>
                                            {availableForms
                                              .filter((form) => form?.id)
                                              .map((form) => (
                                                <option key={form.id} value={form.id}>
                                                  {form.title || 'Untitled Form'}
                                                </option>
                                              ))}
                                          </select>
                                        </div>

                                        {/* Display uploaded content if available */}
                                        {applet.form_progress?.uploadedContent && (
                                          <div className="p-3 bg-green-50 border border-green-200 rounded">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs font-semibold text-green-700">
                                                ✅ Copy Uploaded
                                              </span>
                                              <span className="text-xs text-gray-600">
                                                {applet.form_progress.uploadedFileName || 'Pasted Text'}
                                              </span>
                                            </div>
                                            <div className="max-h-32 overflow-y-auto bg-white p-2 rounded text-xs text-gray-600">
                                              <pre className="whitespace-pre-wrap">
                                                {applet.form_progress.uploadedContent.substring(0, 500)}
                                                {applet.form_progress.uploadedContent.length > 500 && '...'}
                                              </pre>
                                            </div>
                                          </div>
                                        )}

                                        {/* Statistics */}
                                        <div className="flex items-center gap-4 text-xs text-gray-600">
                                          <span>
                                            Mode: {applet.form_progress?.mode || 'Not selected'}
                                          </span>
                                          {applet.form_progress?.uploadedContent && (
                                            <span>
                                              {applet.form_progress.uploadedContent.split(' ').length} words
                                            </span>
                                          )}
                                        </div>
                                      </div>
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
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <FileUploadConfig
                                        applet={applet}
                                        projectId={params.projectId}
                                        projectletId={projectlet.id}
                                        onClose={() => setExpandedApplets(prev => ({ ...prev, [applet.id]: false }))}
                                      />
                                    </div>
                                  )}

                                  {/* Inline palette cleanser configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'palette_cleanser' && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                                      {/* Lock/Unlock toggle */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          {applet.config?.locked ? (
                                            <Lock className="w-4 h-4 text-red-600" />
                                          ) : (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                          )}
                                          <span className="text-sm font-medium">
                                            {applet.config?.locked ? 'Palette Locked' : 'Palette Unlocked'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const newLockedState = !applet.config?.locked;
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      locked: newLockedState
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                              }
                                            } catch (error) {
                                            }
                                          }}
                                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                            applet.config?.locked
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                                          }`}
                                        >
                                          {applet.config?.locked ? 'Unlock Palette' : 'Lock Palette'}
                                        </button>
                                      </div>

                                      {/* Lock status explanation */}
                                      <div className="text-xs text-gray-600 p-2 bg-white rounded border">
                                        {applet.config?.locked ? (
                                          <>
                                            <strong>Locked:</strong> Participants can view their submitted palette preferences but cannot make changes.
                                          </>
                                        ) : (
                                          <>
                                            <strong>Unlocked:</strong> Participants can submit new preferences or edit their existing palette selections.
                                          </>
                                        )}
                                      </div>

                                      {/* Completion statistics */}
                                      {applet.completions && applet.completions.length > 0 && (
                                        <div className="text-xs text-gray-600">
                                          <strong>{applet.completions.length}</strong> participant{applet.completions.length !== 1 ? 's have' : ' has'} completed the palette cleanser
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Inline tone of voice configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'tone_of_voice' && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                                      {/* Lock/Unlock toggle */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          {applet.config?.locked ? (
                                            <Lock className="w-4 h-4 text-red-600" />
                                          ) : (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                          )}
                                          <span className="text-sm font-medium">
                                            {applet.config?.locked ? 'Tone Selection Locked' : 'Tone Selection Unlocked'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const newLockedState = !applet.config?.locked;
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      locked: newLockedState
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                              }
                                            } catch (error) {
                                            }
                                          }}
                                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                            applet.config?.locked
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                                          }`}
                                        >
                                          {applet.config?.locked ? 'Unlock Selection' : 'Lock Selection'}
                                        </button>
                                      </div>

                                      {/* Lock status explanation */}
                                      <div className="text-xs text-gray-600 p-2 bg-white rounded border">
                                        {applet.config?.locked ? (
                                          <>
                                            <strong>Locked:</strong> Participants can view their selected tone of voice but cannot change it.
                                          </>
                                        ) : (
                                          <>
                                            <strong>Unlocked:</strong> Participants can select or change their brand tone of voice.
                                          </>
                                        )}
                                      </div>

                                      {/* Available tone options with details */}
                                      <div className="text-xs text-gray-600">
                                        <div className="font-medium mb-2">Available Tone Options:</div>
                                        <div className="space-y-2">
                                          {[
                                            { name: 'Professional', desc: 'Clean, corporate, and authoritative', sample: 'At our company, we deliver comprehensive solutions...', chars: 'Formal language, Complex sentences' },
                                            { name: 'Casual', desc: 'Friendly and conversational', sample: 'Hey there! We\'re super excited to work with you...', chars: 'Contractions, Simple sentences' },
                                            { name: 'Bold', desc: 'Aggressive and direct', sample: 'Stop settling for mediocrity...', chars: 'Imperative mood, Strong action verbs' },
                                            { name: 'Minimalist', desc: 'Just the facts', sample: 'We build websites. Fast loading. Mobile responsive...', chars: 'Fragments, No adjectives' },
                                            { name: 'Technical', desc: 'Data-driven and precise', sample: 'Our platform leverages a microservices architecture...', chars: 'Technical jargon, Specific metrics' },
                                            { name: 'Inspirational', desc: 'Motivational and uplifting', sample: 'Every great journey begins with a single step...', chars: 'Emotional language, Future-focused' },
                                            { name: 'Playful', desc: 'Fun and humorous', sample: 'Okay, let\'s be real – most company websites...', chars: 'Humor and puns, Self-deprecating' },
                                            { name: 'Luxurious', desc: 'Premium and exclusive', sample: 'Experience the pinnacle of digital craftsmanship...', chars: 'Elevated vocabulary, Sensory language' },
                                            { name: 'Empathetic', desc: 'Caring and understanding', sample: 'We know that choosing the right partner...', chars: 'Emotional validation, Supportive language' },
                                            { name: 'Authoritative', desc: 'Expert and commanding', sample: 'With over 15 years of industry leadership...', chars: 'Credentials emphasized, Evidence-based' }
                                          ].map(tone => (
                                            <details key={tone.name} className="bg-white rounded p-2">
                                              <summary className="cursor-pointer font-medium hover:text-blue-600">{tone.name} - {tone.desc}</summary>
                                              <div className="mt-2 pl-4 space-y-1 text-xs">
                                                <div><strong>Sample:</strong> <em className="text-gray-500">{tone.sample}</em></div>
                                                <div><strong>Characteristics:</strong> <span className="text-gray-500">{tone.chars}</span></div>
                                              </div>
                                            </details>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Completion statistics */}
                                      {applet.completions && applet.completions.length > 0 && (
                                        <div className="text-xs text-gray-600">
                                          <strong>{applet.completions.length}</strong> participant{applet.completions.length !== 1 ? 's have' : ' has'} selected their tone of voice
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Inline phase review configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'phase_review' && (
                                    <PhaseReviewConfig
                                      applet={applet}
                                      projectId={params.projectId}
                                      projectletId={projectlet.id}
                                      onUpdate={() => fetchProjectletApplets(projectlet.id)}
                                    />
                                  )}

                                  {/* Inline AI Form Results configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'ai_form_results' && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                                      {/* Form selector dropdown */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Select Source Form
                                        </label>
                                        <select
                                          value={applet.config?.form_id || ''}
                                          onChange={async (e) => {
                                            try {
                                              const selectedFormId = e.target.value;
                                              const selectedForm = availableForms.find(f => f.id === selectedFormId);
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      form_id: selectedFormId,
                                                      form_title: selectedForm?.title || '',
                                                      ai_report: null, // Clear report when changing form
                                                      last_generated_at: null
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success('Form selected');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update form selection');
                                            }
                                          }}
                                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                          <option value="">Select a form...</option>
                                          {availableForms
                                            .filter((form) => form?.id && form.projectId === params.projectId)
                                            .map((form, formIndex) => {
                                              const optionKey = form.id
                                                ?? form.urlId
                                                ?? form.url_id
                                                ?? `available-form-${formIndex}`;

                                              return (
                                                <option key={optionKey} value={form.id}>
                                                  {form.title}
                                                </option>
                                              );
                                            })}
                                        </select>
                                      </div>

                                      {/* Generate/Regenerate AI Report Button */}
                                      {applet.config?.form_id && (
                                        <div className="flex items-center justify-between">
                                          <button
                                            onClick={async () => {
                                              try {
                                                toast.loading('Generating AI insights...', { id: 'ai-report' });

                                                // Call the AI analysis endpoint
                                                const response = await fetch(
                                                  `/api/ai-analysis/${applet.config.form_id}`,
                                                  {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' }
                                                  }
                                                );

                                                if (!response.ok) {
                                                  const error = await response.json();
                                                  throw new Error(error.error || 'Failed to generate report');
                                                }

                                                const aiData = await response.json();

                                                // Save the report to the applet config
                                                const updateResponse = await fetch(
                                                  `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                  {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      config: {
                                                        ...applet.config,
                                                        ai_report: aiData,
                                                        last_generated_at: new Date().toISOString()
                                                      }
                                                    })
                                                  }
                                                );

                                                if (updateResponse.ok) {
                                                  fetchProjectletApplets(projectlet.id);
                                                  toast.success('AI insights generated successfully!', { id: 'ai-report' });
                                                } else {
                                                  throw new Error('Failed to save report');
                                                }
                                              } catch (error) {
                                                toast.error(error.message || 'Failed to generate AI insights', { id: 'ai-report' });
                                              }
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                          >
                                            <Brain className="w-4 h-4" />
                                            {applet.config?.ai_report ? 'Regenerate AI Insights' : 'Generate AI Insights'}
                                          </button>

                                          {applet.config?.last_generated_at && (
                                            <span className="text-xs text-gray-500">
                                              Last generated: {new Date(applet.config.last_generated_at).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* Preview of AI Report */}
                                      {applet.config?.ai_report && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">AI Report Preview</h4>

                                          {/* Executive Summary */}
                                          {applet.config.ai_report.executiveSummary && (
                                            <div className="mb-3">
                                              <h5 className="text-xs font-medium text-gray-600 uppercase mb-1">Executive Summary</h5>
                                              <p className="text-sm text-gray-700 line-clamp-3">
                                                {applet.config.ai_report.executiveSummary}
                                              </p>
                                            </div>
                                          )}

                                          {/* Key Metrics */}
                                          {applet.config.ai_report.keyMetrics && (
                                            <div className="mb-3">
                                              <h5 className="text-xs font-medium text-gray-600 uppercase mb-1">Key Metrics</h5>
                                              <div className="flex gap-3 flex-wrap">
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                  Responses: {applet.config.ai_report.keyMetrics.totalResponses || 0}
                                                </span>
                                                {applet.config.ai_report.keyMetrics.completionRate && (
                                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                    Completion: {applet.config.ai_report.keyMetrics.completionRate}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Edit Report Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Close any other modals first
                                              setShowAppletManager(false);
                                              setSelectedProjectletForApplet(null);
                                              // Open a modal to edit the report
                                              setEditingAIReport(applet);
                                              setShowAIReportEditor(true);
                                            }}
                                            className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            Edit Report Before Sharing
                                          </button>
                                        </div>
                                      )}

                                      {/* Lock/Unlock toggle */}
                                      <div className="flex items-center justify-between pt-2 border-t">
                                        <div className="flex items-center space-x-2">
                                          {applet.config?.locked ? (
                                            <Lock className="w-4 h-4 text-red-600" />
                                          ) : (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                          )}
                                          <span className="text-sm font-medium">
                                            {applet.config?.locked ? 'Report Published' : 'Report Draft'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const newLockedState = !applet.config?.locked;
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      locked: newLockedState
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success(newLockedState ? 'Report published to client' : 'Report set to draft mode');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update report status');
                                            }
                                          }}
                                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                            applet.config?.locked
                                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                                          }`}
                                        >
                                          {applet.config?.locked ? 'Unpublish' : 'Publish to Client'}
                                        </button>
                                      </div>

                                      {/* Info text */}
                                      <div className="text-xs text-gray-600">
                                        {applet.config?.locked ? (
                                          <>
                                            <strong>Published:</strong> Client can view the AI-generated insights report.
                                          </>
                                        ) : (
                                          <>
                                            <strong>Draft:</strong> Report is hidden from client until published.
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Inline AI Narrative Generator configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'ai_narrative_generator' && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                                      {/* Page Name */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Page Name
                                        </label>
                                        <input
                                          type="text"
                                          value={applet.config?.pageName || 'Homepage'}
                                          onChange={async (e) => {
                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      pageName: e.target.value
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success('Page name updated');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update page name');
                                            }
                                          }}
                                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          placeholder="e.g., Homepage, About Us, Services"
                                        />
                                      </div>

                                      {/* Form selector dropdown */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Select Source Form
                                        </label>
                                        <select
                                          value={applet.config?.formId || ''}
                                          onChange={async (e) => {
                                            try {
                                              const selectedFormId = e.target.value;
                                              const selectedForm = availableForms.find(f => f.id === selectedFormId);
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      formId: selectedFormId,
                                                      formTitle: selectedForm?.title || '',
                                                      generatedContent: null,
                                                      aiGenerated: false,
                                                      lastGeneratedAt: null
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success(selectedFormId ? 'Form selected' : 'Form cleared');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to select form');
                                            }
                                          }}
                                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                          <option value="">Select a form...</option>
                                          {availableForms
                                            .filter((form) => form?.id)
                                            .map((form, formIndex) => {
                                              const optionKey = form.id
                                                ?? form.urlId
                                                ?? form.url_id
                                                ?? `available-form-${formIndex}`;

                                              return (
                                                <option key={optionKey} value={form.id}>
                                                  {form.title}
                                                </option>
                                              );
                                            })}
                                        </select>
                                      </div>

                                      {/* Copy collection applet selector */}
                                      {(() => {
                                        const currentApplets = projectletApplets?.[projectlet.id] || [];
                                        const copyCollectionApplets = currentApplets.filter(app => app.type === 'copy_collection');

                                        if (copyCollectionApplets.length === 0) {
                                          return null;
                                        }

                                        return (
                                          <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Select Copy Collection Source
                                            </label>
                                            <select
                                              value={applet.config?.copyCollectionAppletId || ''}
                                              onChange={async (event) => {
                                                const selectedId = event.target.value || null;

                                                try {
                                                  const response = await fetch(
                                                    `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                    {
                                                      method: 'PATCH',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({
                                                        config: {
                                                          ...applet.config,
                                                          copyCollectionAppletId: selectedId,
                                                          generatedContent: null,
                                                          aiGenerated: false,
                                                          lastGeneratedAt: null
                                                        }
                                                      })
                                                    }
                                                  );

                                                  if (response.ok) {
                                                    fetchProjectletApplets(projectlet.id);
                                                    toast.success(selectedId ? 'Copy collection source selected' : 'Copy collection source cleared');
                                                  }
                                                } catch (error) {
                                                  toast.error('Failed to update copy collection source');
                                                }
                                              }}
                                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            >
                                              <option value="">None</option>
                                              {copyCollectionApplets.map(copyApplet => (
                                                <option key={copyApplet.id} value={copyApplet.id}>
                                                  {(() => {
                                                    const baseLabel = copyApplet.name || 'Copy Collection';
                                                    const pageNameLabel = copyApplet.config?.pageName;
                                                    if (pageNameLabel) {
                                                      return `${baseLabel}: ${pageNameLabel}`;
                                                    }
                                                    const projectletName = projectlet?.name || projectlet?.title;
                                                    if (projectletName) {
                                                      return `${baseLabel}: ${projectletName}`;
                                                    }
                                                    return baseLabel;
                                                  })()}
                                                </option>
                                              ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Only the selected copy collection applet for this projectlet will feed the AI narrative.
                                            </p>
                                          </div>
                                        );
                                      })()}

                                      {/* Page type preset */}
                                      <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Page Type Guidance
                                        </label>
                                        <select
                                          value={applet.config?.pageTypePreset || ''}
                                          onChange={async (event) => {
                                            const selectedPreset = event.target.value || null;

                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      pageTypePreset: selectedPreset,
                                                      generatedContent: null,
                                                      aiGenerated: false,
                                                      lastGeneratedAt: null
                                                    }
                                                  })
                                                }
                                              );

                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success(selectedPreset ? 'Page type guidance saved' : 'Page type guidance cleared');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update page type guidance');
                                            }
                                          }}
                                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                          <option value="">Custom / Not specified</option>
                                          {pageTypeGuides.map(guide => (
                                            <option key={guide.value} value={guide.value}>
                                              {guide.label}
                                            </option>
                                          ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Tailor the structure and emphasis for this page type.
                                        </p>
                                      </div>

                                      {/* Target length */}
                                      <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Target Narrative Length
                                        </label>
                                        <select
                                          value={applet.config?.narrativeLength || 'balanced'}
                                          onChange={async (event) => {
                                            const selectedLength = event.target.value;

                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      narrativeLength: selectedLength,
                                                      generatedContent: null,
                                                      aiGenerated: false,
                                                      lastGeneratedAt: null
                                                    }
                                                  })
                                                }
                                              );

                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success('Narrative length preference saved');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update narrative length');
                                            }
                                          }}
                                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                          {narrativeLengthOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Controls how expansive the generated copy should be.
                                        </p>
                                      </div>

                                      {/* Generate/Regenerate button */}
                                      {(applet.config?.formId || applet.config?.copyCollectionAppletId) && (
                                        <div className="flex items-center justify-between">
                                          <button
                                            onClick={async () => {
                                              try {

                                                toast.loading('Generating narrative content...', { id: 'ai-narrative' });

                                                // Call the API to generate narrative
                                                const response = await fetch('/api/ai-narrative-generator', {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    formId: applet.config.formId,
                                                    copyCollectionAppletId: applet.config?.copyCollectionAppletId || null,
                                                    pageName: applet.config.pageName || 'Homepage',
                                                    pageTypePreset: applet.config?.pageTypePreset || null,
                                                    narrativeLength: applet.config?.narrativeLength || 'balanced',
                                                    projectId: params.projectId
                                                  })
                                                });

                                                if (!response.ok) {
                                                  throw new Error('Failed to generate narrative');
                                                }

                                                const narrativeData = await response.json();

                                                // Save the generated content
                                                const updateResponse = await fetch(
                                                  `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                  {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      config: {
                                                        ...applet.config,
                                                        generatedContent: narrativeData,
                                                        aiGenerated: true,
                                                        lastGeneratedAt: new Date().toISOString()
                                                      }
                                                    })
                                                  }
                                                );

                                                if (updateResponse.ok) {
                                                  fetchProjectletApplets(projectlet.id);
                                                  toast.success('Narrative content generated successfully!', { id: 'ai-narrative' });
                                                } else {
                                                  throw new Error('Failed to save narrative');
                                                }
                                              } catch (error) {
                                                toast.error(error.message || 'Failed to generate narrative', { id: 'ai-narrative' });
                                              }
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                                          >
                                            <Brain className="w-4 h-4" />
                                            {applet.config?.generatedContent ? 'Regenerate Narrative' : 'Generate Narrative'}
                                          </button>

                                          {applet.config?.lastGeneratedAt && (
                                            <span className="text-xs text-gray-500">
                                              Last generated: {new Date(applet.config.lastGeneratedAt).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* Preview of Generated Content */}
                                      {applet.config?.generatedContent && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Content Preview</h4>

                                          <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {Object.entries(applet.config.generatedContent).map(([section, content]) => (
                                              <div key={section} className="border-b border-gray-100 pb-2 last:border-0">
                                                <h5 className="text-xs font-medium text-gray-600 uppercase mb-1">{section}</h5>
                                                <p className="text-sm text-gray-700 line-clamp-3">{content}</p>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Edit Content Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Set up state for editing
                                              setEditingNarrativeApplet(applet);
                                              setShowNarrativeEditor(true);
                                            }}
                                            className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            Edit Content
                                          </button>
                                        </div>
                                      )}

                                      {/* Lock/Unlock toggle */}
                                      <div className="flex items-center justify-between pt-2 border-t">
                                        <div className="flex items-center space-x-2">
                                          {applet.config?.locked ? (
                                            <Lock className="w-4 h-4 text-red-600" />
                                          ) : (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                          )}
                                          <span className="text-sm font-medium">
                                            {applet.config?.locked ? 'Content Published' : 'Content Draft'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      locked: !applet.config?.locked
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                                toast.success(applet.config?.locked ? 'Content unpublished' : 'Content published to client!');
                                              }
                                            } catch (error) {
                                              toast.error('Failed to update publish status');
                                            }
                                          }}
                                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                            applet.config?.locked
                                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                                          }`}
                                        >
                                          {applet.config?.locked ? 'Unpublish' : 'Publish to Client'}
                                        </button>
                                      </div>

                                      {/* Info text */}
                                      <div className="text-xs text-gray-600">
                                        {applet.config?.locked ? (
                                          <>
                                            <strong>Published:</strong> Client can view the narrative content for their {applet.config?.pageName || 'page'}.
                                          </>
                                        ) : (
                                          <>
                                            <strong>Draft:</strong> Content is hidden from client until published.
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Inline video applet configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'video' && (
                                      <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                                        {/* Video URL */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Video URL
                                          </label>
                                          <input
                                            type="url"
                                            defaultValue={applet.config?.video_url || ''}
                                            id={`video-url-${applet.id}`}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="https://vimeo.com/video/123456789 or YouTube URL"
                                          />
                                          <p className="text-xs text-gray-500 mt-1">
                                            Supports Vimeo, YouTube, Cloudinary, and direct video URLs
                                          </p>
                                        </div>

                                        {/* Title */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Video Title
                                          </label>
                                          <input
                                            type="text"
                                            defaultValue={applet.config?.title || ''}
                                            id={`video-title-${applet.id}`}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="Welcome Video"
                                          />
                                        </div>

                                        {/* Description */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                          </label>
                                          <textarea
                                            defaultValue={applet.config?.description || ''}
                                            id={`video-description-${applet.id}`}
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="Watch this brief introduction to understand our process..."
                                          />
                                        </div>

                                        {/* Save Button */}
                                        <div className="flex justify-end space-x-2 pt-2 border-t">
                                          <button
                                            onClick={async () => {
                                              try {
                                                const videoUrl = document.getElementById(`video-url-${applet.id}`).value;
                                                const videoTitle = document.getElementById(`video-title-${applet.id}`).value;
                                                const videoDescription = document.getElementById(`video-description-${applet.id}`).value;

                                                const response = await fetch(
                                                  `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                  {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      config: {
                                                        ...applet.config,
                                                        video_url: videoUrl,
                                                        title: videoTitle,
                                                        description: videoDescription
                                                      }
                                                    })
                                                  }
                                                );
                                                if (response.ok) {
                                                  toast.success('Video settings saved');
                                                  fetchProjectletApplets(projectlet.id);
                                                }
                                              } catch (error) {
                                                toast.error('Failed to save video settings');
                                              }
                                            }}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                          >
                                            Save Changes
                                          </button>
                                        </div>

                                        {/* Lock/Unlock toggle */}
                                        <div className="flex items-center justify-between pt-2 border-t">
                                          <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-700">
                                              Status:
                                            </span>
                                            <span className={`text-sm font-semibold ${
                                              applet.config?.locked
                                                ? 'text-green-600'
                                                : 'text-gray-500'
                                            }`}>
                                              {applet.config?.locked ? 'Published to Client' : 'Draft'}
                                            </span>
                                          </div>
                                          <button
                                            onClick={async () => {
                                              const newLocked = !applet.config?.locked;
                                              try {
                                                const response = await fetch(
                                                  `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                  {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      config: {
                                                        ...applet.config,
                                                        locked: newLocked
                                                      }
                                                    })
                                                  }
                                                );
                                                if (response.ok) {
                                                  toast.success(
                                                    newLocked
                                                      ? 'Video published to client'
                                                      : 'Video unpublished from client'
                                                  );
                                                  fetchProjectletApplets(projectlet.id);
                                                }
                                              } catch (error) {
                                                toast.error('Failed to toggle publish status');
                                              }
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                              applet.config?.locked
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                          >
                                            {applet.config?.locked ? 'Unpublish' : 'Publish to Client'}
                                          </button>
                                        </div>

                                        {/* Info text */}
                                        <div className="text-xs text-gray-600 mt-2">
                                          {applet.config?.locked ? (
                                            <>
                                              <strong>Published:</strong> Client can view and watch the video. Progress is tracked automatically.
                                            </>
                                          ) : (
                                            <>
                                              <strong>Draft:</strong> Video is hidden from client until published.
                                            </>
                                          )}
                                        </div>
                                      </div>
                                  )}

                                  {/* Inline client review configuration */}
                                  {expandedApplets[applet.id] && applet.type === 'client_review' && (
                                    <div className={`mt-3 p-3 rounded-lg space-y-3 ${
                                      applet.form_progress?.status === 'revision_requested'
                                        ? 'bg-orange-50 border-2 border-orange-300'
                                        : 'bg-gray-50'
                                    }`}>
                                      {/* Warning banner for revision requested */}
                                      {applet.form_progress?.status === 'revision_requested' && (
                                        <div className="bg-orange-100 border border-orange-400 rounded-md p-3 mb-3">
                                          <div className="flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                              <p className="font-semibold text-orange-900">⚠️ Agency Action Required</p>
                                              <p className="text-sm text-orange-800 mt-1">
                                                The client has requested revisions. Please submit updated work.
                                              </p>
                                              {applet.form_progress?.revision_notes && (
                                                <div className="mt-2 p-2 bg-white/50 rounded">
                                                  <p className="text-sm font-medium text-orange-900">Client's Request:</p>
                                                  <p className="text-sm text-orange-800 mt-1">{applet.form_progress.revision_notes}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Header field */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Review Header
                                        </label>
                                        <input
                                          type="text"
                                          value={applet.config?.header || 'Review & Approve'}
                                          onChange={async (e) => {
                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      header: e.target.value
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                              }
                                            } catch (error) {
                                            }
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder="e.g., Please Review the Logo Designs"
                                        />
                                      </div>

                                      {/* Description field */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Review Description
                                        </label>
                                        <textarea
                                          value={applet.config?.description || 'Please review the work above and let us know if it meets your requirements.'}
                                          onChange={async (e) => {
                                            try {
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      description: e.target.value
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                              }
                                            } catch (error) {
                                            }
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          rows={3}
                                          placeholder="Explain what you're asking the client to review"
                                        />
                                      </div>

                                      {/* Review status display */}
                                      {applet.form_progress && (
                                        <div className="bg-white p-3 rounded-md border">
                                          <div className="text-sm">
                                            <div className="font-medium mb-2">Review Status</div>
                                            {applet.form_progress.status === 'approved' ? (
                                              <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="w-5 h-5" />
                                                <span>Approved by {applet.form_progress.reviewed_by || 'Client Admin'}</span>
                                                {applet.form_progress.approved_at && (
                                                  <span className="text-xs text-gray-500">
                                                    on {new Date(applet.form_progress.approved_at).toLocaleDateString()}
                                                  </span>
                                                )}
                                              </div>
                                            ) : applet.form_progress.status === 'revision_requested' ? (
                                              <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-orange-600">
                                                  <AlertCircle className="w-5 h-5" />
                                                  <span className="font-medium">Revision Requested</span>
                                                </div>
                                                {applet.form_progress.revision_notes && (
                                                  <div className="bg-orange-50 p-2 rounded text-sm">
                                                    <strong>Client Notes:</strong> {applet.form_progress.revision_notes}
                                                  </div>
                                                )}
                                                {applet.form_progress.revision_count && (
                                                  <div className="text-xs text-gray-600">
                                                    Revision {applet.form_progress.revision_count} of {applet.config?.max_revisions || 2}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="text-gray-500">
                                                Awaiting client review
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Lock/Unlock toggle */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          {applet.config?.locked ? (
                                            <Lock className="w-4 h-4 text-red-600" />
                                          ) : (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                          )}
                                          <span className="text-sm font-medium">
                                            {applet.config?.locked ? 'Review Locked' : 'Review Unlocked'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const newLockedState = !applet.config?.locked;
                                              const response = await fetch(
                                                `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    config: {
                                                      ...applet.config,
                                                      locked: newLockedState
                                                    }
                                                  })
                                                }
                                              );
                                              if (response.ok) {
                                                fetchProjectletApplets(projectlet.id);
                                              }
                                            } catch (error) {
                                            }
                                          }}
                                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                            applet.config?.locked
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                                          }`}
                                        >
                                          {applet.config?.locked ? 'Unlock Review' : 'Lock Review'}
                                        </button>
                                      </div>

                                      {/* Lock status explanation */}
                                      <div className="text-xs text-gray-600 p-2 bg-white rounded border">
                                        {applet.config?.locked ? (
                                          <>
                                            <strong>Locked:</strong> Client Admins can view the review decision but cannot change it.
                                          </>
                                        ) : (
                                          <>
                                            <strong>Unlocked:</strong> Client Admins can approve work or request revisions.
                                          </>
                                        )}
                                      </div>

                                      {/* Revision limit info */}
                                      <div className="text-xs text-gray-600">
                                        <strong>Note:</strong> Client contracts include up to <strong>{applet.config?.max_revisions || 2} revision requests</strong> per step.
                                      </div>
                                    </div>
                                  )}
                                  </div> {/* End of Applet Configuration Section */}
                                </div>
                                </SortableApplet>
                                {/* Spacer between applets */}
                                {appletIndex < applets.length - 1 && (
                                  <div className="h-2" />
                                )}
                                {/* Drop zone after this applet */}
                                {isDraggingApplet && draggedAppletInfo?.id !== applet.id && (
                                  <div
                                    className={`transition-all ${
                                      dropTargetProjectletId === projectlet.id && dropTargetIndex === appletIndex + 1
                                        ? 'h-12 border-2 border-dashed border-blue-500 bg-blue-50 rounded mb-2'
                                        : 'h-1'
                                    }`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDropTargetProjectletId(projectlet.id);
                                      setDropTargetIndex(appletIndex + 1);
                                    }}
                                    onDragLeave={(e) => {
                                      e.stopPropagation();
                                      if (dropTargetIndex === appletIndex + 1) {
                                        setDropTargetIndex(null);
                                        setDropTargetProjectletId(null);
                                      }
                                    }}
                                    onDrop={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await handleAppletDrop(draggedAppletInfo.id, draggedAppletInfo.projectletId, projectlet.id, appletIndex + 1);
                                      setDropTargetIndex(null);
                                      setDropTargetProjectletId(null);
                                    }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                            </SortableContext>
                          </div>
                        ) : (
                          <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg bg-white/30">
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
                  </SortableProjectlet>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Project Information</h3>
                {!editingProjectInfo ? (
                  <button
                    onClick={startEditingProjectInfo}
                    className="text-black hover:bg-gray-100 p-1 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={saveProjectInfo}
                      className="text-green-600 hover:bg-green-50 p-1 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingProjectInfo(false);
                        setTempProjectInfo({
                          project_type: project?.metadata?.project_type || 'Website Design',
                          scope: {
                            main_pages: project?.metadata?.scope?.main_pages || project?.rules?.main_pages || 5,
                            aux_pages: project?.metadata?.scope?.aux_pages || project?.rules?.aux_pages || 5,
                            description: project?.metadata?.scope?.description || 'Standard website package'
                          }
                        });
                      }}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Client:</span>
                  <div className="font-medium">{project?.client_name}</div>
                  <div className="text-gray-600">{project?.client_email}</div>
                </div>

                <div>
                  <span className="text-gray-600">Project Type:</span>
                  {editingProjectInfo ? (
                    <select
                      value={tempProjectInfo.project_type}
                      onChange={(e) => setTempProjectInfo(prev => ({ ...prev, project_type: e.target.value }))}
                      className="w-full mt-1 px-2 py-1 border rounded"
                    >
                      <option value="Website Design">Website Design</option>
                      <option value="Web Application">Web Application</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="Landing Page">Landing Page</option>
                      <option value="Blog/CMS">Blog/CMS</option>
                      <option value="Portfolio">Portfolio</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <div className="font-medium">
                      {project?.metadata?.project_type || 'Website Design'}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-gray-600">Website URL:</span>
                  {editingProjectInfo ? (
                    <input
                      type="url"
                      value={tempProjectInfo.website_url}
                      onChange={(e) => setTempProjectInfo(prev => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full mt-1 px-2 py-1 border rounded"
                    />
                  ) : (
                    <div className="font-medium">
                      {project?.metadata?.website_url || 'Not set'}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-gray-600">Status:</span>
                  <select
                    value={project?.status || 'initiated'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        const response = await fetch(`/api/aloa-projects/${params.projectId}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            status: newStatus
                          })
                        });

                        if (response.ok) {
                          toast.success('Project status updated');
                          fetchProjectData(); // Refresh project data
                        } else {
                          throw new Error('Failed to update status');
                        }
                      } catch (error) {
                        toast.error('Failed to update project status');
                      }
                    }}
                    className={`mt-1 w-full px-3 py-1 rounded-lg font-medium border-2 transition-colors cursor-pointer
                      ${project?.status === 'initiated' ? 'bg-gray-100 text-gray-700 border-gray-300' : ''}
                      ${project?.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}
                      ${project?.status === 'design_phase' ? 'bg-purple-100 text-purple-700 border-purple-300' : ''}
                      ${project?.status === 'development_phase' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : ''}
                      ${project?.status === 'review' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : ''}
                      ${project?.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' : ''}
                      ${project?.status === 'on_hold' ? 'bg-red-100 text-red-700 border-red-300' : ''}
                    `}
                  >
                    <option value="initiated">Initiated</option>
                    <option value="in_progress">In Progress</option>
                    <option value="design_phase">Design Phase</option>
                    <option value="development_phase">Development Phase</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
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
                  {editingProjectInfo ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-20">Main Pages:</label>
                        <input
                          type="number"
                          min="1"
                          value={tempProjectInfo.scope.main_pages}
                          onChange={(e) => setTempProjectInfo(prev => ({
                            ...prev,
                            scope: { ...prev.scope, main_pages: parseInt(e.target.value) || 1 }
                          }))}
                          className="w-16 px-2 py-1 border rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-20">Aux Pages:</label>
                        <input
                          type="number"
                          min="0"
                          value={tempProjectInfo.scope.aux_pages}
                          onChange={(e) => setTempProjectInfo(prev => ({
                            ...prev,
                            scope: { ...prev.scope, aux_pages: parseInt(e.target.value) || 0 }
                          }))}
                          className="w-16 px-2 py-1 border rounded"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Description:</label>
                        <input
                          type="text"
                          value={tempProjectInfo.scope.description}
                          onChange={(e) => setTempProjectInfo(prev => ({
                            ...prev,
                            scope: { ...prev.scope, description: e.target.value }
                          }))}
                          placeholder="e.g., Standard website package"
                          className="w-full mt-1 px-2 py-1 border rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">
                        {project?.metadata?.scope?.main_pages || project?.rules?.main_pages || 5} main pages,{' '}
                        {project?.metadata?.scope?.aux_pages || project?.rules?.aux_pages || 5} aux pages
                      </div>
                      {project?.metadata?.scope?.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {project.metadata.scope.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Team Members</h3>
                <button
                  onClick={() => setShowTeamMemberModal(true)}
                  className="text-black hover:bg-gray-100 p-1 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No team members assigned yet
                  </p>
                ) : (
                  teamMembers.map((member, memberIndex) => {
                    if (!member) {
                      return null;
                    }

                    const memberKey = member.id
                      ?? member.user_id
                      ?? `team-member-${memberIndex}`;

                    return (
                      <div key={memberKey} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <UserAvatar
                          user={{
                            full_name: member.name,
                            email: member.email,
                            avatar_url: member.avatar_url
                          }}
                          size="sm"
                        />
                        <div>
                          <div className="font-medium text-sm">{member.name || member.email}</div>
                          <div className="flex items-center gap-2">
                            {(member.system_role || member.project_role || member.role) && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded capitalize">
                                {(() => {
                                  const role = member.system_role || member.project_role || member.role;
                                  // Format role names properly
                                  const roleDisplay = {
                                    'super_admin': 'Super Admin',
                                    'project_admin': 'Project Admin',
                                    'team_member': 'Team Member',
                                    'client': 'Client',
                                    'client_admin': 'Client Admin',
                                    'client_participant': 'Client Participant',
                                    'viewer': 'Viewer',
                                    'editor': 'Editor'
                                  };
                                  return roleDisplay[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveTeamMember(member.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      </div>
                  );
                  })
                )}
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
                  projectForms.slice(0, 5).map((form, formIndex) => {
                    if (!form) {
                      return null;
                    }

                    const formKey = form.id
                      ?? form.urlId
                      ?? form.url_id
                      ?? `project-form-${formIndex}`;

                    return (
                      <div key={formKey} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{form.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {form.response_count || 0} responses • {form.status}
                          </p>
                          {/* Show avatars of form respondents if available */}
                          {form.respondents && form.respondents.length > 0 && (
                            <div className="flex -space-x-1">
                              {form.respondents.slice(0, 3).map((user, respondentIndex) => {
                                if (!user) {
                                  return null;
                                }

                                const respondentKey = user.id
                                  ?? user.email
                                  ?? `form-respondent-${respondentIndex}`;

                                return (
                                  <UserAvatar
                                    key={respondentKey}
                                    user={user}
                                    size="xs"
                                    className="ring-1 ring-white"
                                  />
                                );
                              })}
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
                            const exported = await fetchAndExportFormResponses(form.id, form.title);
                            if (exported) {
                              toast.success('Responses exported successfully');
                            } else if (form.response_count === 0) {
                              toast.error('No responses to export');
                            } else {
                              toast.error('Failed to export responses');
                            }
                          }}
                          className="p-1 hover:bg-green-100 rounded"
                          title="Export Responses as CSV"
                        >
                          <Download className="w-3 h-3 text-green-600" />
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
                  );
                  })
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
                    {availableForms
                      .filter((form) => form?.id)
                      .map((form, formIndex) => {
                        const optionKey = form.id
                          ?? form.urlId
                          ?? form.url_id
                          ?? `available-form-${formIndex}`;

                        return (
                          <option key={optionKey} value={form.id}>
                            {form.title} ({form.status})
                          </option>
                        );
                      })}
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
                    role: 'client_admin',
                    phone: '',
                    bio: '',
                    responsibilities: '',
                    preferences: '',
                    linkedin_url: '',
                    importance_score: 5,
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
                  importance_score: parseInt(formData.get('importance')),
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
                      {(availableUsers || [])
                        .filter(user => ['client', 'client_admin', 'client_participant'].includes(user.role)) // Only show client users for stakeholders
                        .map(user => (
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
                    defaultValue={editingStakeholder?.role || 'client_admin'}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="client_admin">Client Admin</option>
                    <option value="client_participant">Client Participant</option>
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
                    defaultValue={editingStakeholder?.importance_score || editingStakeholder?.importance || 5}
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

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <SaveTemplateModal
          isOpen={showSaveTemplateModal}
          onClose={() => {
            setShowSaveTemplateModal(false);
            setSelectedTemplateProjectlet(null);
          }}
          projectId={params.projectId}
          selectedProjectlet={selectedTemplateProjectlet}
          allProjectlets={selectedTemplateProjectlet ? null : projectlets}
          projectletApplets={projectletApplets}
        />
      )}

      {/* Load Template Modal */}
      {showLoadTemplateModal && (
        <LoadTemplateModal
          isOpen={showLoadTemplateModal}
          onClose={() => setShowLoadTemplateModal(false)}
          projectId={params.projectId}
          onLoadTemplate={() => {
            // Refresh the page after loading template
            window.location.reload();
          }}
        />
      )}

      {/* Create from Sitemap Modal */}
      {showCreateFromSitemapModal && (
        <CreateFromSitemapModal
          projectId={params.projectId}
          onClose={() => setShowCreateFromSitemapModal(false)}
          onSuccess={(message) => {
            toast.success(message);
            setShowCreateFromSitemapModal(false);
            // Refresh projectlets
            fetchProjectlets();
          }}
        />
      )}

      {/* Team Member Modal */}
      {showTeamMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Add Team Member</h2>
              <button
                onClick={() => {
                  setShowTeamMemberModal(false);
                  setSelectedTeamUserId('');
                  setSelectedProjectRole('team_member');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Select User</label>
                <select
                  value={selectedTeamUserId}
                  onChange={(e) => {
                    setSelectedTeamUserId(e.target.value);
                    // Auto-populate project role based on user's system role
                    const selectedUser = availableUsers.find(u => u.id === e.target.value);
                    if (selectedUser) {
                      // Map system role to project role
                      if (selectedUser.role === 'super_admin') {
                        setSelectedProjectRole('super_admin');
                      } else if (selectedUser.role === 'project_admin') {
                        setSelectedProjectRole('project_admin');
                      } else if (selectedUser.role === 'team_member') {
                        setSelectedProjectRole('team_member');
                      } else {
                        setSelectedProjectRole('team_member'); // Default fallback
                      }
                    }
                  }}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Choose a user...</option>
                  {availableUsers
                    .filter(user => !['client', 'client_admin', 'client_participant'].includes(user.role)) // Only show non-client users (team members)
                    .filter(user => !teamMembers.some(m => m.user_id === user.id)) // Filter out already assigned users
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.role})
                      </option>
                    ))}
                </select>
              </div>

              {/* Project Role Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Project Role</label>
                <select
                  value={selectedProjectRole}
                  onChange={(e) => setSelectedProjectRole(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="project_admin">Project Admin</option>
                  <option value="team_member">Team Member</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedProjectRole === 'super_admin' && 'Full system access and control over the project'}
                  {selectedProjectRole === 'project_admin' && 'Can manage project settings, team, and content'}
                  {selectedProjectRole === 'team_member' && 'Can work on project tasks and content'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowTeamMemberModal(false);
                    setSelectedTeamUserId('');
                    setSelectedProjectRole('team_member');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeamMember}
                  disabled={!selectedTeamUserId}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Team Member
                </button>
              </div>
            </div>
          </div>
        </div>
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
                  }
                }}
                projectContext={knowledgeBase}
                projectName={project?.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Response Modal */}
      {showFormResponseModal && (
        <FormResponseModal
          isOpen={showFormResponseModal}
          onClose={() => setShowFormResponseModal(false)}
          formId={selectedResponseData.formId}
          userId={selectedResponseData.userId}
          userName={selectedResponseData.userName}
          formName={selectedResponseData.formName}
        />
      )}

      {/* Palette Results Modal */}
      {showPaletteResultsModal && selectedPaletteData && (
        <PaletteResultsModal
          userName={selectedPaletteData.userName}
          responseData={selectedPaletteData.responseData}
          isAmalgamated={selectedPaletteData.isAmalgamated}
          onClose={() => {
            setShowPaletteResultsModal(false);
            setSelectedPaletteData(null);
          }}
        />
      )}

      {/* Sitemap Viewer Modal */}
      {showSitemapViewerModal && selectedSitemapData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedSitemapData.userName}'s Sitemap
                </h2>
                {selectedSitemapData.submittedAt && (
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(selectedSitemapData.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSitemapViewerModal(false);
                  setSelectedSitemapData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedSitemapData.sitemapData ? (
                <SitemapBuilder
                  config={{}}
                  projectScope={selectedSitemapData.projectScope}
                  isLocked={true} // View-only mode
                  initialData={selectedSitemapData.sitemapData}
                  appletId={selectedSitemapData.appletId}
                  projectId={params.projectId}
                  userId={selectedSitemapData.userEmail}
                  websiteUrl={selectedSitemapData.websiteUrl}
                  onAutoSave={() => {}} // Disabled in view mode
                  onSave={() => {}} // Disabled in view mode
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sitemap data available for this user.</p>
                  {selectedSitemapData.allCompletions && selectedSitemapData.allCompletions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm mb-2">Select a user to view their sitemap:</p>
                      <div className="flex justify-center space-x-2">
                        {selectedSitemapData.allCompletions.map((completion, idx) => (
                          <button
                            key={completion.id || idx}
                            onClick={async () => {
                              // Fetch and display this user's sitemap
                              const userEmail = completion.user?.email || completion.user_id;
                              const response = await fetch(
                                `/api/aloa-projects/${params.projectId}/applet-interactions?appletId=${selectedSitemapData.appletId}&userEmail=${userEmail}&type=sitemap_save`
                              );
                              if (response.ok) {
                                const data = await response.json();
                                const userSitemapData = data.interactions?.[0]?.data?.sitemap_data;
                                if (userSitemapData) {
                                  setSelectedSitemapData(prev => ({
                                    ...prev,
                                    userName: completion.user?.full_name || completion.user?.email || 'Unknown User',
                                    userEmail: userEmail,
                                    sitemapData: userSitemapData,
                                    submittedAt: completion.completed_at || completion.started_at
                                  }));
                                }
                              }
                            }}
                            className="p-1 hover:opacity-80 transition-opacity"
                            title={`View ${completion.user?.full_name || completion.user?.email || 'User'}'s sitemap`}
                          >
                            <UserAvatar
                              user={completion.user || { email: completion.user_id }}
                              size="sm"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tone of Voice Modal */}
      {showToneOfVoiceModal && selectedToneData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedToneData.userName}'s Tone of Voice Selection
                </h2>
                {selectedToneData.submittedAt && (
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(selectedToneData.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowToneOfVoiceModal(false);
                  setSelectedToneData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedToneData.selectedTone ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-3">Selected Tone of Voice:</p>
                    <div className="inline-flex items-center justify-center px-8 py-4 bg-black text-white rounded-lg">
                      <span className="text-2xl font-semibold">{selectedToneData.selectedTone}</span>
                    </div>
                  </div>

                  {/* Show education level if available */}
                  {selectedToneData.educationLevel && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">Target Reading Level:</p>
                      <div className="inline-flex items-center justify-center px-6 py-2 bg-gray-100 text-gray-700 rounded-lg">
                        <span className="font-medium">
                          {selectedToneData.educationLevel === 'elementary' && 'Elementary (Grade School)'}
                          {selectedToneData.educationLevel === 'middle' && 'Middle School'}
                          {selectedToneData.educationLevel === 'high' && 'High School'}
                          {selectedToneData.educationLevel === 'college' && 'College/University'}
                          {selectedToneData.educationLevel === 'graduate' && 'Graduate/Professional'}
                          {selectedToneData.educationLevel === 'phd' && 'PhD/Expert'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show sample paragraph */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 mb-3">SAMPLE PARAGRAPH:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedToneData.selectedTone === 'Professional' && 'At our company, we deliver comprehensive solutions tailored to meet the evolving needs of modern enterprises. Our team of industry experts brings decades of combined experience to every project, ensuring that your business objectives are met with precision and professionalism. We maintain the highest standards of quality throughout our engagement, providing transparent communication and measurable results that drive sustainable growth for your organization.'}
                      {selectedToneData.selectedTone === 'Casual' && 'Hey there! We\'re super excited to work with you on this project. We know that finding the right partner can be tough, but don\'t worry – we\'ve got your back. Our team loves what we do, and we\'re here to make sure you have a great experience from start to finish. Let\'s grab a coffee (virtual or real!) and chat about how we can help bring your ideas to life.'}
                      {selectedToneData.selectedTone === 'Bold' && 'Stop settling for mediocrity. Your competition isn\'t waiting, and neither should you. We don\'t just deliver solutions – we demolish obstacles and obliterate limitations. Every day you delay is a day your rivals get ahead. It\'s time to make a decision that actually matters. Choose dominance. Choose excellence. Choose to win.'}
                      {selectedToneData.selectedTone === 'Minimalist' && 'We build websites. Fast loading. Mobile responsive. SEO optimized. Clear navigation. Secure hosting. Regular updates. Fixed pricing. No hidden fees. Two week delivery. One revision round included. Support available.'}
                      {selectedToneData.selectedTone === 'Technical' && 'Our platform leverages a microservices architecture deployed on Kubernetes, ensuring 99.99% uptime through automated failover and load balancing. The API processes 10,000 requests per second with sub-100ms latency, utilizing Redis caching and PostgreSQL with read replicas. Our CI/CD pipeline implements automated testing with 95% code coverage, deploying to production through blue-green deployments to minimize downtime.'}
                      {selectedToneData.selectedTone === 'Inspirational' && 'Every great journey begins with a single step, and today, you\'re taking yours. Imagine a world where your vision becomes reality, where boundaries dissolve and possibilities emerge. Together, we\'ll transform challenges into opportunities, dreams into achievements. Your potential is limitless, and we\'re here to help you unlock it. The future you\'ve been dreaming of? It starts now.'}
                      {selectedToneData.selectedTone === 'Playful' && 'Okay, let\'s be real – most company websites are about as exciting as watching paint dry. (Sorry, paint-watching enthusiasts!) But here\'s the thing: who says business has to be boring? We\'re a bunch of creative weirdos who happen to be really, really good at what we do. We\'ll make you look awesome online, have some laughs along the way, and maybe even become friends. Warning: side effects may include actually enjoying the process!'}
                      {selectedToneData.selectedTone === 'Luxurious' && 'Experience the pinnacle of digital craftsmanship, where every pixel is meticulously placed and every interaction thoughtfully orchestrated. Our bespoke solutions are reserved for those who demand nothing less than perfection. From conception to completion, we curate an unparalleled journey that reflects the sophistication of your brand. This is not merely web design; this is digital artistry at its finest.'}
                      {selectedToneData.selectedTone === 'Empathetic' && 'We know that choosing the right partner for your project can feel overwhelming, and we genuinely understand the weight of this decision. You\'re not just investing money; you\'re investing trust, hope, and vision. That\'s why we take the time to truly listen to your concerns, understand your challenges, and support you through every uncertainty. Your success matters deeply to us, not just as a business outcome, but because we care about the people behind every project.'}
                      {selectedToneData.selectedTone === 'Authoritative' && 'With over 15 years of industry leadership, we have consistently set the standards that others follow. Our methodologies, published in leading industry journals and adopted by Fortune 500 companies, have proven their effectiveness time and again. When you work with us, you\'re not just hiring a service provider; you\'re partnering with the recognized authorities in digital innovation. The results speak for themselves: 97% client retention, 200+ industry awards, and consistent recognition as the benchmark for excellence.'}
                    </p>
                  </div>

                  {/* Show characteristics */}
                  <div className="mt-4 p-4 bg-white border rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 mb-3">CHARACTERISTICS:</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const toneCharacteristics = {
                          'Professional': ['Formal language', 'Complex sentences', 'Industry terminology', 'Third-person perspective'],
                          'Casual': ['Contractions', 'Simple sentences', 'Personal pronouns', 'Conversational tone'],
                          'Bold': ['Imperative mood', 'Short, punchy sentences', 'Strong action verbs', 'Direct commands'],
                          'Minimalist': ['Fragments acceptable', 'No adjectives', 'Lists and bullets', 'Essential info only'],
                          'Technical': ['Technical jargon', 'Specific metrics', 'Detailed specifications', 'Acronyms and numbers'],
                          'Inspirational': ['Emotional language', 'Future-focused', 'Metaphorical', 'Second-person address'],
                          'Playful': ['Humor and puns', 'Self-deprecating', 'Parenthetical asides', 'Casual punctuation'],
                          'Luxurious': ['Elevated vocabulary', 'Sensory language', 'Exclusivity emphasis', 'Refined tone'],
                          'Empathetic': ['Emotional validation', 'Active listening cues', 'Supportive language', 'Personal connection'],
                          'Authoritative': ['Credentials emphasized', 'Definitive statements', 'Evidence-based', 'Third-party validation']
                        };

                        const characteristics = toneCharacteristics[selectedToneData.selectedTone] || [];
                        return characteristics.map((char) => (
                          <span key={char} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">{char}</span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-gray-500 mb-3">Selected Tone of Voice:</p>
                  <div className="inline-flex items-center justify-center px-8 py-4 bg-black text-white rounded-lg">
                    <span className="text-xl font-semibold">Not selected</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Review Modal */}
      {showClientReviewModal && selectedClientReviewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Client Review Details: {selectedClientReviewData.appletName}
                </h2>
                <p className="text-sm text-gray-500">
                  Reviewed by: {selectedClientReviewData.userName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowClientReviewModal(false);
                  setSelectedClientReviewData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Review Status */}
              <div className={`p-4 rounded-lg ${
                selectedClientReviewData.status === 'approved' ? 'bg-green-50 border-2 border-green-200' :
                selectedClientReviewData.status === 'revision_requested' ? 'bg-orange-50 border-2 border-orange-200' :
                'bg-gray-50 border-2 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Status</span>
                  {selectedClientReviewData.status === 'approved' ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">APPROVED</span>
                    </div>
                  ) : selectedClientReviewData.status === 'revision_requested' ? (
                    <div className="flex items-center gap-2 text-orange-700">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">REVISION REQUESTED</span>
                    </div>
                  ) : (
                    <span className="text-gray-600">Pending Review</span>
                  )}
                </div>

                {/* Timestamps */}
                {selectedClientReviewData.approvedAt && (
                  <p className="text-sm text-gray-600">
                    Approved on: {new Date(selectedClientReviewData.approvedAt).toLocaleString()}
                  </p>
                )}
                {selectedClientReviewData.revisionRequestedAt && (
                  <p className="text-sm text-gray-600">
                    Revision requested on: {new Date(selectedClientReviewData.revisionRequestedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Revision Notes - The most important part for rejected work */}
              {selectedClientReviewData.status === 'revision_requested' && selectedClientReviewData.revisionNotes && (
                <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900 mb-2">Client's Revision Request:</h3>
                      <p className="text-orange-800 whitespace-pre-wrap">{selectedClientReviewData.revisionNotes}</p>
                    </div>
                  </div>

                  {selectedClientReviewData.revisionCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-sm text-orange-700">
                        This is revision request #{selectedClientReviewData.revisionCount}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Agency Action Required Alert */}
              {selectedClientReviewData.status === 'revision_requested' && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-900">Agency Action Required</p>
                      <p className="text-sm text-yellow-800 mt-1">
                        The client has requested revisions. Please review their feedback and submit updated work.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message for Approved Work */}
              {selectedClientReviewData.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Work Approved!</p>
                      <p className="text-sm text-green-800 mt-1">
                        The client has approved this work. You can proceed to the next step.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Report Editor Modal */}
      {showAIReportEditor && editingAIReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Edit AI Report
              </h2>
              <button
                onClick={() => {
                  setShowAIReportEditor(false);
                  setEditingAIReport(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const formData = new FormData(e.target);
                    const updatedReport = {
                      executiveSummary: formData.get('executiveSummary'),
                      keyMetrics: editingAIReport.config?.ai_report?.keyMetrics || {},
                      insights: formData.get('insights')?.split('\n').filter(Boolean) || [],
                      recommendations: formData.get('recommendations')?.split('\n').filter(Boolean) || [],
                      conclusion: formData.get('conclusion')
                    };

                    const response = await fetch(
                      `/api/aloa-projects/${params.projectId}/projectlets/${editingAIReport.projectlet_id}/applets/${editingAIReport.id}`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          config: {
                            ...editingAIReport.config,
                            ai_report: updatedReport
                          }
                        })
                      }
                    );

                    if (response.ok) {
                      toast.success('Report updated successfully');
                      setShowAIReportEditor(false);
                      setEditingAIReport(null);
                      // Refresh the applets
                      fetchProjectData();
                    } else {
                      throw new Error('Failed to update report');
                    }
                  } catch (error) {
                    toast.error('Failed to update report');
                  }
                }}
                className="space-y-6"
              >
                {/* Executive Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Executive Summary
                  </label>
                  <textarea
                    name="executiveSummary"
                    defaultValue={editingAIReport.config?.ai_report?.executiveSummary || ''}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Provide a high-level summary of the form responses..."
                  />
                </div>

                {/* Key Insights */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Insights
                    <span className="text-xs text-gray-500 ml-2">(One per line)</span>
                  </label>
                  <textarea
                    name="insights"
                    defaultValue={editingAIReport.config?.ai_report?.insights?.join('\n') || ''}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="• Key finding 1\n• Key finding 2\n• Key finding 3"
                  />
                </div>

                {/* Recommendations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recommendations
                    <span className="text-xs text-gray-500 ml-2">(One per line)</span>
                  </label>
                  <textarea
                    name="recommendations"
                    defaultValue={editingAIReport.config?.ai_report?.recommendations?.join('\n') || ''}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="• Recommendation 1\n• Recommendation 2\n• Recommendation 3"
                  />
                </div>

                {/* Conclusion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conclusion
                  </label>
                  <textarea
                    name="conclusion"
                    defaultValue={editingAIReport.config?.ai_report?.conclusion || ''}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Summarize the key takeaways..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAIReportEditor(false);
                      setEditingAIReport(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Narrative Content Editor Modal */}
      {showNarrativeEditor && editingNarrativeApplet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Narrative Content - {editingNarrativeApplet.config?.pageName || 'Page'}
              </h2>
              <button
                onClick={() => {
                  setShowNarrativeEditor(false);
                  setEditingNarrativeApplet(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const formData = new FormData(e.target);
                    const updatedContent = {};

                    // Collect all content sections
                    for (const [key, value] of formData.entries()) {
                      if (key.startsWith('section_')) {
                        const sectionName = key.replace('section_', '').replace(/_/g, ' ');
                        updatedContent[sectionName] = value;
                      }
                    }

                    // Find the correct projectlet ID
                    const projectletId = projectlets.find(p =>
                      p.applets?.some(a => a.id === editingNarrativeApplet.id)
                    )?.id;

                    if (!projectletId) {
                      throw new Error('Could not find projectlet for this applet');
                    }

                    const response = await fetch(
                      `/api/aloa-projects/${params.projectId}/projectlets/${projectletId}/applets/${editingNarrativeApplet.id}`,
                      {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          config: {
                            ...editingNarrativeApplet.config,
                            generatedContent: updatedContent
                          }
                        })
                      }
                    );

                    if (response.ok) {
                      toast.success('Narrative content updated successfully!');
                      fetchProjectletApplets(projectletId);
                      setShowNarrativeEditor(false);
                      setEditingNarrativeApplet(null);
                    } else {
                      throw new Error('Failed to update content');
                    }
                  } catch (error) {
                    toast.error(error.message || 'Failed to update narrative content');
                  }
                }}
                className="space-y-6"
              >
                {/* Dynamic sections based on generated content */}
                {editingNarrativeApplet.config?.generatedContent && Object.entries(editingNarrativeApplet.config.generatedContent).map(([section, content]) => (
                  <div key={section}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {section}
                    </label>
                    <textarea
                      name={`section_${section.replace(/ /g, '_')}`}
                      defaultValue={content}
                      rows={6}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Enter content for ${section}...`}
                    />
                  </div>
                ))}

                {/* Add new section button */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const sectionName = prompt('Enter new section name:');
                      if (sectionName) {
                        const updatedContent = {
                          ...editingNarrativeApplet.config.generatedContent,
                          [sectionName]: ''
                        };
                        setEditingNarrativeApplet({
                          ...editingNarrativeApplet,
                          config: {
                            ...editingNarrativeApplet.config,
                            generatedContent: updatedContent
                          }
                        });
                      }
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Section
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNarrativeEditor(false);
                      setEditingNarrativeApplet(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Project Insights Chat */}
      <ProjectInsightsChat projectId={params.projectId} />

      {/* Floating Chat Button - Fixed to bottom-right */}
      <button
        onClick={() => {
          setShowChatModal(true);
          setUnreadCount(0); // Reset count when opening
        }}
        className="fixed bottom-8 left-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 group"
        style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 50 }}
        title="Open Project Chat"
      >
        <MessageSquare className="h-6 w-6" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 text-xs font-bold animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Attention Animation Ring */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
        )}
      </button>

      {/* Copy Collection View Modal */}
      {showCopyCollectionModal && selectedCopyCollectionData && (
        <CopyCollectionViewModal
          isOpen={showCopyCollectionModal}
          onClose={() => {
            setShowCopyCollectionModal(false);
            setSelectedCopyCollectionData(null);
          }}
          appletProgress={selectedCopyCollectionData.appletProgress}
          stakeholder={selectedCopyCollectionData.stakeholder}
          appletName={selectedCopyCollectionData.appletName}
        />
      )}

      {/* Phase Review Response Modal */}
      {showPhaseReviewModal && selectedPhaseReviewData && (
        <PhaseReviewResponseViewer
          response={selectedPhaseReviewData.response}
          userName={selectedPhaseReviewData.userName}
          onClose={() => {
            setShowPhaseReviewModal(false);
            setSelectedPhaseReviewData(null);
          }}
        />
      )}

      {/* Chat Modal */}
      {showChatModal && currentUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Project Communication
              </h2>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                projectId={params.projectId}
                currentUser={currentUser}
                isClientView={false}
                onMessagesRead={() => {
                  // Already cleared when opening, but this ensures sync
                  setUnreadCount(0);
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
    <AuthGuard 
      allowedRoles={['super_admin', 'project_admin', 'team_member']}
      redirectTo="/auth/login"
    >
      <AdminProjectPageContent />
    </AuthGuard>
  );
}
