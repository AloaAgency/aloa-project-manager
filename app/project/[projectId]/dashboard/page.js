'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Lock,
  FileText,
  Upload,
  Eye,
  MessageSquare,
  Palette,
  Map,
  Star,
  Trophy,
  Target,
  Zap,
  X,
  Edit2,
  ExternalLink,
  Link,
  Download,
  File,
  FolderOpen,
  Home
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';
import AuthGuard from '@/components/AuthGuard';
import useEscapeKey from '@/hooks/useEscapeKey';
import { createClient } from '@/lib/supabase-browser';

// Dynamic imports for heavy components
const ConfettiCelebration = dynamic(() => import('@/components/ConfettiCelebration'), { ssr: false });
const EnhancedFileRepository = dynamic(() => import('@/components/EnhancedFileRepository'), { ssr: false });
const PaletteCleanserModal = dynamic(() => import('@/components/PaletteCleanserModal'), { ssr: false });
const SitemapBuilder = dynamic(() => import('@/components/SitemapBuilderV2'), { ssr: false });
const ToneOfVoiceSelector = dynamic(() => import('@/components/ToneOfVoiceSelector'), { ssr: false });
const ClientReview = dynamic(() => import('@/components/ClientReview'), { ssr: false });

function ClientDashboard() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [projectlets, setProjectlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplet, setSelectedApplet] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedApplets, setCompletedApplets] = useState(new Set());
  const [stats, setStats] = useState({ totalApplets: 0, completedApplets: 0, progressPercentage: 0 });
  const [formProgress, setFormProgress] = useState({}); // Store progress for each form
  const [userId, setUserId] = useState(null); // Track user ID
  const [userFormResponses, setUserFormResponses] = useState({}); // Track actual form submissions by form ID
  const [isFormViewOnly, setIsFormViewOnly] = useState(false); // Track if form is in view-only mode
  const [showLinkSubmissionModal, setShowLinkSubmissionModal] = useState(false); // Track link submission modal
  const [showFileUploadModal, setShowFileUploadModal] = useState(false); // Track file upload modal
  const [showPaletteCleanserModal, setShowPaletteCleanserModal] = useState(false); // Track palette cleanser modal
  const [isPaletteCleanserViewOnly, setIsPaletteCleanserViewOnly] = useState(false); // Track if palette cleanser is view-only
  const [showSitemapModal, setShowSitemapModal] = useState(false); // Track sitemap modal
  const [isSitemapViewOnly, setIsSitemapViewOnly] = useState(false); // Track if sitemap is view-only
  const [showToneOfVoiceModal, setShowToneOfVoiceModal] = useState(false); // Track tone of voice modal
  const [isToneOfVoiceViewOnly, setIsToneOfVoiceViewOnly] = useState(false); // Track if tone of voice is view-only
  const [selectedToneOfVoiceApplet, setSelectedToneOfVoiceApplet] = useState(null); // Track selected tone applet
  const [showClientReviewModal, setShowClientReviewModal] = useState(false); // Track client review modal
  const [isClientReviewViewOnly, setIsClientReviewViewOnly] = useState(false); // Track if client review is view-only
  const [userRole, setUserRole] = useState(null); // Track user role
  const [activeTab, setActiveTab] = useState('journey'); // Track active tab

  // ESC key handlers for modals
  useEscapeKey(() => {
    setShowFormModal(false);
    setIsFormViewOnly(false);
  }, showFormModal);

  useEscapeKey(() => {
    setShowLinkSubmissionModal(false);
  }, showLinkSubmissionModal);

  useEscapeKey(() => {
    setShowFileUploadModal(false);
  }, showFileUploadModal);

  useEscapeKey(() => {
    setShowPaletteCleanserModal(false);
  }, showPaletteCleanserModal);

  useEscapeKey(() => {
    setShowSitemapModal(false);
  }, showSitemapModal);

  useEscapeKey(() => {
    setShowClientReviewModal(false);
    setIsClientReviewViewOnly(false);
  }, showClientReviewModal);

  useEffect(() => {
    // Get authenticated user's ID
    const getAuthenticatedUser = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);

        // Fetch user profile to get role
        const { data: profile } = await supabase
          .from('aloa_user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
        }
      } else {
        console.error('No authenticated user found:', error);
        // Fallback to localStorage for anonymous users (shouldn't happen with AuthGuard)
        const storedUserId = localStorage.getItem('client_user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          const newUserId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('client_user_id', newUserId);
          setUserId(newUserId);
        }
      }
    };
    
    getAuthenticatedUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProjectData();
    }
  }, [params.projectId, userId]);

  // Handle ESC key to close all modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        // Close all modals when ESC is pressed
        setShowFormModal(false);
        setShowLinkSubmissionModal(false);
        setShowFileUploadModal(false);
        setShowPaletteCleanserModal(false);
        setShowSitemapModal(false);
        setShowToneOfVoiceModal(false);
        // Only clear form-related state if form modal was open
        if (showFormModal) {
          setSelectedFormId(null);
          setSelectedForm(null);
        }
        // Clear other modal-specific state
        if (showLinkSubmissionModal) {
          setSelectedLinkSubmission(null);
        }
        if (showPaletteCleanserModal) {
          setSelectedPaletteApplet(null);
        }
        if (showSitemapModal || showFileUploadModal || showLinkSubmissionModal) {
          setSelectedApplet(null);
        }
        if (showToneOfVoiceModal) {
          setSelectedToneOfVoiceApplet(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  const fetchProjectData = async () => {
    try {
      // Fetch project data and projectlets from client-view endpoint with user ID
      const response = await fetch(`/api/aloa-projects/${params.projectId}/client-view?userId=${userId}`);
      const data = await response.json();
      
      setProject(data.project);
      setProjectlets(data.projectlets || []);
      setStats(data.stats || { totalApplets: 0, completedApplets: 0, progressPercentage: 0 });
      
      // Build completed set from user-specific status
      const completed = new Set();
      data.projectlets?.forEach(projectlet => {
        projectlet.applets?.forEach(applet => {
          // Use user-specific status if available, otherwise fallback to default
          const status = applet.user_status || applet.status;
          if (status === 'completed' || status === 'approved') {
            completed.add(applet.id);
          }
          // Restore form progress if available
          if (applet.form_progress && applet.form_id) {
            setFormProgress(prev => ({
              ...prev,
              [applet.form_id]: applet.form_progress
            }));
          }
        });
      });
      setCompletedApplets(completed);
      
      // Fetch all form responses for this user to properly track submissions
      try {
        const formIds = new Set();
        data.projectlets?.forEach(projectlet => {
          projectlet.applets?.forEach(applet => {
            if (applet.type === 'form' && (applet.form_id || applet.config?.form_id)) {
              formIds.add(applet.form_id || applet.config?.form_id);
            }
          });
        });
        
        // Fetch responses for all forms
        const formResponses = {};
        for (const formId of formIds) {
          const responseRes = await fetch(`/api/aloa-responses?form_id=${formId}&user_id=${userId}`);
          if (responseRes.ok) {
            const responseData = await responseRes.json();
            if (responseData.responses && responseData.responses.length > 0) {
              formResponses[formId] = responseData.responses[0];
            }
          }
        }
        setUserFormResponses(formResponses);
        console.log('User form responses loaded:', formResponses);
      } catch (error) {
        console.error('Error fetching form responses:', error);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppletClick = async (applet, projectlet, isViewOnly = false) => {
    // For forms, allow editing if completed but not locked
    const isForm = applet.type === 'form';
    const isLinkSubmission = applet.type === 'link_submission';
    const isFileUpload = applet.type === 'upload' || applet.type === 'file_upload';
    const isPaletteCleanser = applet.type === 'palette_cleanser';
    const isSitemap = applet.type === 'sitemap';
    const isToneOfVoice = applet.type === 'tone_of_voice';
    const isClientReview = applet.type === 'client_review';
    const formId = applet.form_id || applet.config?.form_id;
    const formIsLocked = isForm && applet.form?.status === 'closed';
    const paletteIsLocked = isPaletteCleanser && applet.config?.locked === true;
    const sitemapIsLocked = isSitemap && applet.config?.locked === true;
    const toneOfVoiceIsLocked = isToneOfVoice && applet.config?.locked === true;
    const clientReviewIsLocked = isClientReview && applet.config?.locked === true;
    const userHasCompleted = isForm && formId ? userFormResponses[formId] : completedApplets.has(applet.id);

    // Block if:
    // 1. Non-form, non-link-submission, non-file-upload, non-palette-cleanser, non-sitemap, non-tone-of-voice, non-client-review applet that's already completed
    // 2. Form that's locked and user hasn't submitted (can't start new)
    // Link submissions, file uploads, palette cleanser, sitemap, tone of voice, and client review should always be viewable even after completion
    if ((!isForm && !isLinkSubmission && !isFileUpload && !isPaletteCleanser && !isSitemap && !isToneOfVoice && !isClientReview && userHasCompleted) || (isForm && formIsLocked && !userHasCompleted)) {
      return; // Cannot proceed
    }

    // Only mark as in_progress if not already completed
    if (!completedApplets.has(applet.id)) {
      await fetch(`/api/aloa-projects/${params.projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: 'in_progress',
          interactionType: 'view',
          userId: userId
        })
      });
    }

    if (applet.type === 'form') {
      // Check for form_id in multiple places
      const formId = applet.form_id || applet.config?.form_id;
      
      if (!formId) {
        console.error('No form_id found for applet:', applet);
        alert('This form is not properly configured. Please contact support.');
        return;
      }
      
      // Set view-only mode if form is locked (isViewOnly parameter is true)
      setIsFormViewOnly(isViewOnly);
      
      // If user has already completed this form, get their previous responses
      let previousResponses = null;
      if (userHasCompleted && userFormResponses[formId]) {
        previousResponses = userFormResponses[formId].response_data;
        console.log('Loaded previous responses for', isViewOnly ? 'viewing' : 'editing', ':', previousResponses);
      }
      
      // Use form data from applet if available, otherwise fetch
      if (applet.form) {
        // Transform the preloaded form data to match MultiStepFormRenderer's expected structure
        const form = applet.form;
        const sortedFields = form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];
        
        const transformedForm = {
          ...form,
          _id: form.id,
          urlId: form.url_id,
          fields: sortedFields.map(field => ({
            _id: field.id,
            label: field.field_label,
            name: field.field_name,
            type: field.field_type,
            position: field.field_order,
            section: field.validation?.section || 'General Information',
            required: field.required,
            placeholder: field.placeholder,
            options: Array.isArray(field.options) ? field.options : (typeof field.options === 'string' ? JSON.parse(field.options) : field.options),
            validation: field.validation
          }))
        };
        
        console.log('Transformed preloaded form:', transformedForm);
        console.log('Form fields count:', transformedForm.fields?.length);
        console.log('Form fields:', transformedForm.fields);
        setFormData(transformedForm);
        setSelectedApplet({ ...applet, projectlet, form_id: applet.form_id || applet.config?.form_id });
        
        // If we have previous responses, set them as saved progress
        if (previousResponses) {
          setFormProgress(prev => ({
            ...prev,
            [formId]: { data: previousResponses }
          }));
        }
        
        setShowFormModal(true);
      } else {
        try {
          const formRes = await fetch(`/api/aloa-forms/${formId}`);
          if (!formRes.ok) {
            throw new Error(`Failed to fetch form: ${formRes.status}`);
          }
          const form = await formRes.json();
          console.log('Fetched form:', form);
          
          // Transform the form data to match MultiStepFormRenderer's expected structure
          const sortedFields = form.aloa_form_fields?.sort((a, b) => (a.field_order || 0) - (b.field_order || 0)) || [];
          
          const transformedForm = {
            ...form,
            _id: form.id,
            urlId: form.url_id,
            fields: sortedFields.map(field => ({
              _id: field.id,
              label: field.field_label,
              name: field.field_name,
              type: field.field_type,
              position: field.field_order,
              section: field.validation?.section || 'General Information',
              required: field.required,
              placeholder: field.placeholder,
              options: Array.isArray(field.options) ? field.options : (typeof field.options === 'string' ? JSON.parse(field.options) : field.options),
              validation: field.validation
            }))
          };
          
          console.log('Transformed form:', transformedForm);
          setFormData(transformedForm);
          setSelectedApplet({ ...applet, projectlet, form_id: formId });
          
          // If we have previous responses, set them as saved progress
          if (previousResponses) {
            setFormProgress(prev => ({
              ...prev,
              [formId]: { data: previousResponses }
            }));
          }
          
          setShowFormModal(true);
        } catch (error) {
          console.error('Error fetching form:', error);
          alert('Unable to load the form. Please try again later.');
        }
      }
    } else if (applet.type === 'link_submission') {
      // Handle link submission applet
      setSelectedApplet({ ...applet, projectlet });
      setShowLinkSubmissionModal(true);
    } else if (isFileUpload) {
      // Handle file upload applet
      console.log('Debug - File Upload Click:', {
        appletId: applet.id,
        appletName: applet.name,
        appletType: applet.type,
        appletConfig: applet.config,
        configFiles: applet.config?.files,
        configFilesType: typeof applet.config?.files
      });

      // Files can be in two places: config.files or aloa_project_files table
      const fetchFiles = async () => {
        try {
          // Start with files from config - handle string, array, or object formats
          // Note: Files can be in config.files OR config.attached_files
          let configFiles = [];
          const filesField = applet.config?.files || applet.config?.attached_files;

          if (filesField) {
            if (typeof filesField === 'string') {
              try {
                configFiles = JSON.parse(filesField);
                console.log('Debug - Parsed files from string config:', configFiles);
              } catch (e) {
                console.error('Failed to parse files string:', e, 'Raw string:', filesField);
                configFiles = [];
              }
            } else if (Array.isArray(filesField)) {
              configFiles = filesField;
              console.log('Debug - Files already array in config:', configFiles);
            } else if (typeof filesField === 'object') {
              // Handle object format - might be a single file or an object with array property
              console.log('Debug - Files is an object:', filesField);
              // Check if it's an object with a files array inside
              if (filesField.files && Array.isArray(filesField.files)) {
                configFiles = filesField.files;
              } else if (filesField.data && Array.isArray(filesField.data)) {
                configFiles = filesField.data;
              } else {
                // Try to extract values from object
                configFiles = Object.values(filesField);
              }
              console.log('Debug - Extracted from object:', configFiles);
            } else {
              console.log('Debug - Config files is unknown type:', typeof filesField, filesField);
            }
          } else {
            console.log('Debug - No files in applet config (checked both files and attached_files)');
          }
          console.log('Debug - Final config files:', configFiles);

          // Also fetch from aloa_project_files table
          const response = await fetch(`/api/project-files?applet_id=${applet.id}`);
          let apiFiles = [];

          if (response.ok) {
            const data = await response.json();
            apiFiles = data.files || [];
            console.log('Debug - Files from API:', apiFiles);
          }

          // Merge both sources
          const allFiles = [...configFiles];

          // Add files from API that aren't already in config
          apiFiles.forEach(file => {
            if (!allFiles.some(f => f.id === file.id || f.name === file.file_name)) {
              allFiles.push({
                id: file.id,
                name: file.file_name,
                size: file.file_size,
                type: file.file_type,
                url: file.url,
                category: file.category,
                storage_type: file.storage_type,
                uploaded_at: file.created_at || file.uploaded_at
              });
            }
          });

          console.log('Debug - Total files combined:', allFiles);

          // Update the applet with all files
          const updatedApplet = {
            ...applet,
            projectlet,
            config: {
              ...applet.config,
              files: allFiles
            }
          };

          console.log('Debug - Updated applet before setting:', {
            id: updatedApplet.id,
            name: updatedApplet.name,
            configFiles: updatedApplet.config?.files,
            filesCount: updatedApplet.config?.files?.length
          });

          setSelectedApplet(updatedApplet);
          setShowFileUploadModal(true);
        } catch (error) {
          console.error('Error fetching files:', error);
          // Still show modal with config files if fetch fails
          setSelectedApplet({ ...applet, projectlet });
          setShowFileUploadModal(true);
        }
      };

      fetchFiles();
    } else if (isPaletteCleanser) {
      // Handle palette cleanser applet
      const userAlreadyCompleted = completedApplets.has(applet.id);
      setSelectedApplet({ ...applet, projectlet });
      setIsPaletteCleanserViewOnly(paletteIsLocked && userAlreadyCompleted);
      setShowPaletteCleanserModal(true);
    } else if (isSitemap) {
      // Handle sitemap applet
      const userAlreadyCompleted = completedApplets.has(applet.id);
      setSelectedApplet({ ...applet, projectlet });
      // Only lock if the applet itself is locked - completion doesn't lock it
      setIsSitemapViewOnly(sitemapIsLocked);
      setShowSitemapModal(true);
    } else if (isToneOfVoice) {
      // Handle tone of voice applet
      const userAlreadyCompleted = completedApplets.has(applet.id);
      setSelectedApplet({ ...applet, projectlet });
      setIsToneOfVoiceViewOnly(toneOfVoiceIsLocked && userAlreadyCompleted);
      setSelectedToneOfVoiceApplet({ ...applet, projectlet });
      setShowToneOfVoiceModal(true);
    } else if (isClientReview) {
      // Handle client review applet
      setSelectedApplet({ ...applet, projectlet });
      setIsClientReviewViewOnly(clientReviewIsLocked);
      setShowClientReviewModal(true);
    }
  };

  const handleFormSubmit = async (responses) => {
    try {
      // Get CSRF token (generate a simple one for now)
      const csrfToken = Math.random().toString(36).substring(2);
      document.cookie = `csrf-token=${csrfToken}; path=/`;

      // Submit form response with project ID and user ID
      const responseResult = await fetch('/api/aloa-responses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          formId: selectedApplet.form_id || selectedApplet.form?.id,
          projectId: params.projectId,  // Include the project ID
          userId: userId,  // Include the user ID
          data: responses
        })
      });

      if (!responseResult.ok) {
        console.error('Failed to submit form response:', await responseResult.text());
      }

      // Mark applet as completed for this user
      const updateResult = await fetch(`/api/aloa-projects/${params.projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: selectedApplet.id,
          status: 'completed',
          interactionType: 'submission',
          userId: userId,
          data: { form_responses: responses }
        })
      });

      if (!updateResult.ok) {
        console.error('Failed to update applet status:', await updateResult.text());
        throw new Error('Failed to mark form as completed');
      }

      // Update local state
      const newCompleted = new Set(completedApplets);
      newCompleted.add(selectedApplet.id);
      setCompletedApplets(newCompleted);
      
      // Update form responses state to track this submission
      const formId = selectedApplet.form_id || selectedApplet.form?.id;
      if (formId) {
        setUserFormResponses(prev => ({
          ...prev,
          [formId]: {
            response_data: responses,
            submitted_at: new Date().toISOString()
          }
        }));
        
        // Clear saved progress for this form since it's completed
        setFormProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[formId];
          return newProgress;
        });
      }

      // Close modal and show celebration
      setShowFormModal(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 7000);

      // Refresh data to get updated status from server
      fetchProjectData();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting the form. Please try again.');
    }
  };

  const getAppletIcon = (type) => {
    const icons = {
      form: FileText,
      upload: Upload,
      review: Eye,
      moodboard: Palette,
      content_gather: MessageSquare,
      sitemap: Map
    };
    return icons[type] || FileText;
  };

  const calculateProgress = () => {
    return stats.progressPercentage || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ConfettiCelebration show={showConfetti} duration={6000} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project?.project_name || project?.name || 'Project Dashboard'}</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome to your project workspace</p>
            </div>
            
            {/* Progress Ring */}
            <div className="relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${progress * 2.26} 226`}
                  className="text-purple-600 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'journey'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Project Journey</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>File Repository</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Complete</p>
                <p className="text-2xl font-bold">{stats.completedApplets || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    // Count applets that are in progress (started but not completed)
                    let inProgressCount = 0;
                    projectlets.forEach(projectlet => {
                      projectlet.applets?.forEach(applet => {
                        const status = applet.user_status || applet.status;
                        if (status === 'in_progress' || status === 'started') {
                          inProgressCount++;
                        }
                      });
                    });
                    return inProgressCount;
                  })()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Locked</p>
                <p className="text-2xl font-bold">
                  {projectlets.filter(p => p.status === 'locked').length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-gray-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Achievement</p>
                <p className="text-2xl font-bold">🏆</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'journey' ? (
          /* Projectlets Timeline */
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Your Project Journey</h2>
          
          {projectlets.map((projectlet, index) => {
            const isLocked = projectlet.status === 'locked';
            const isCompleted = projectlet.status === 'completed';
            const applets = projectlet.applets || [];
            
            // Check if projectlet is in progress (has started applets but not all complete)
            const hasStartedApplets = applets.some(applet => {
              const status = applet.user_status || applet.status;
              return status === 'in_progress' || status === 'started' || status === 'completed' || status === 'approved';
            });
            const allAppletsComplete = applets.length > 0 && applets.every(applet => {
              const status = applet.user_status || applet.status;
              return status === 'completed' || status === 'approved';
            });
            const isInProgress = hasStartedApplets && !allAppletsComplete;
            
            return (
              <div
                key={projectlet.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                  isLocked ? 'opacity-60' : ''
                }`}
              >
                {/* Projectlet Header */}
                <div className={`p-6 border-b ${
                  isCompleted ? 'bg-green-50' : 
                  isInProgress ? 'bg-yellow-50' :
                  isLocked ? 'bg-gray-50' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-100 text-green-600' :
                        isInProgress ? 'bg-yellow-100 text-yellow-600' :
                        isLocked ? 'bg-gray-100 text-gray-400' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {isCompleted ? <CheckCircle className="w-6 h-6" /> : 
                         isInProgress ? <Clock className="w-6 h-6" /> :
                         isLocked ? <Lock className="w-6 h-6" /> : 
                         <span className="font-bold">{index + 1}</span>}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{projectlet.name}</h3>
                        {projectlet.description && (
                          <p className="text-sm text-gray-600">{projectlet.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {projectlet.deadline && (
                      <div className="text-sm text-gray-500">
                        Due: {new Date(projectlet.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Applets (Tasks) */}
                {!isLocked && applets.length > 0 && (
                  <div className={`p-6 ${isInProgress ? 'bg-yellow-50/50' : ''}`}>
                    <div className="space-y-3">
                      {applets.map(applet => {
                        const Icon = getAppletIcon(applet.type);
                        const isAppletCompleted = completedApplets.has(applet.id);
                        // Check if it's a form and whether it's still accepting responses
                        const isForm = applet.type === 'form';
                        const formId = applet.form_id || applet.config?.form_id;
                        const formIsLocked = isForm && applet.form?.status === 'closed';
                        // Check actual form submissions, not just applet status
                        const userHasSubmitted = isForm && formId && userFormResponses[formId];
                        
                        // Determine display state
                        let buttonState = 'available';
                        let statusMessage = null;

                        // Check if applet is in progress (started but not completed)
                        const isInProgress = applet.user_started_at && !applet.user_completed_at;

                        // Get completion date if available
                        const completionDate = applet.user_completed_at ?
                          new Date(applet.user_completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : null;

                        if (isForm) {
                          const submissionDate = userHasSubmitted && userFormResponses[formId]?.submitted_at ?
                            new Date(userFormResponses[formId].submitted_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : completionDate;

                          if (userHasSubmitted && formIsLocked) {
                            // User has submitted AND form is locked - can view only
                            buttonState = 'completed-locked';
                            statusMessage = submissionDate ?
                              `Form submitted on ${submissionDate} • Locked` :
                              'Form completed & locked. No longer accepting responses.';
                          } else if (userHasSubmitted && !formIsLocked) {
                            // User has submitted but form still accepting responses - can edit
                            buttonState = 'user-complete-editable';
                            statusMessage = submissionDate ?
                              `Submitted on ${submissionDate} • Click to edit` :
                              'Form completed! We are still awaiting other responses. Want to make a change? Click the pencil icon.';
                          } else if (formIsLocked) {
                            // Form is locked but user hasn't submitted
                            buttonState = 'locked';
                            statusMessage = 'Form closed to new responses';
                          }
                        } else if (applet.type === 'link_submission' && isAppletCompleted) {
                          // Link submissions should be viewable even after completion
                          buttonState = 'link-completed';
                          statusMessage = completionDate ?
                            `Links reviewed on ${completionDate}` :
                            'Links reviewed - click to view again';
                        } else if ((applet.type === 'upload' || applet.type === 'file_upload') && isAppletCompleted) {
                          // File uploads should be viewable even after completion
                          buttonState = 'file-completed';
                          statusMessage = completionDate ?
                            `Files reviewed on ${completionDate}` :
                            'Files reviewed - click to view again';
                        } else if (applet.type === 'sitemap') {
                          const sitemapIsLocked = applet.config?.locked === true;
                          if (isAppletCompleted && sitemapIsLocked) {
                            buttonState = 'completed-locked';
                            statusMessage = completionDate ?
                              `Sitemap submitted on ${completionDate} • Locked` :
                              'Sitemap submitted & locked. No longer accepting changes.';
                          } else if (isAppletCompleted && !sitemapIsLocked) {
                            buttonState = 'user-complete-editable';
                            statusMessage = completionDate ?
                              `Submitted on ${completionDate} • Click to edit` :
                              'Sitemap submitted! Click the pencil icon to make changes.';
                          } else if (isInProgress && !sitemapIsLocked) {
                            buttonState = 'in-progress-editing';
                            statusMessage = 'Continue building your sitemap';
                          } else if (sitemapIsLocked) {
                            buttonState = 'locked';
                            statusMessage = 'Sitemap locked - no longer accepting changes';
                          }
                        } else if (applet.type === 'tone_of_voice') {
                          const toneIsLocked = applet.config?.locked === true;

                          if (isAppletCompleted && toneIsLocked) {
                            buttonState = 'completed-locked';
                            statusMessage = completionDate ?
                              `Tone selected on ${completionDate} • Locked` :
                              'Tone selected & locked. No longer accepting changes.';
                          } else if (isAppletCompleted && !toneIsLocked) {
                            buttonState = 'user-complete-editable';
                            statusMessage = completionDate ?
                              `Selected on ${completionDate} • Click to change` :
                              'Tone selected! Click the pencil icon to change your selection.';
                          } else if (isInProgress && !toneIsLocked) {
                            buttonState = 'in-progress-editing';
                            statusMessage = 'Continue selecting your tone of voice';
                          } else if (toneIsLocked) {
                            buttonState = 'locked';
                            statusMessage = 'Tone selection locked - no longer accepting changes';
                          }
                        } else if (applet.type === 'client_review') {
                          const reviewIsLocked = applet.config?.locked === true;
                          const reviewStatus = applet.form_progress?.status;

                          if (reviewStatus === 'approved') {
                            buttonState = 'completed-locked';
                            statusMessage = 'Work approved ✅';
                          } else if (reviewStatus === 'revision_requested') {
                            buttonState = 'in-progress-editing';
                            statusMessage = `Revision requested (${applet.form_progress?.revision_count || 1} of ${applet.config?.max_revisions || 2})`;
                          } else if (reviewIsLocked) {
                            buttonState = 'locked';
                            statusMessage = 'Review locked';
                          } else {
                            buttonState = userRole === 'client_admin' ? 'not-started' : 'locked';
                            statusMessage = userRole === 'client_admin' ? 'Review & approve work' : 'Client Admin access required';
                          }
                        } else if (applet.type === 'palette_cleanser') {
                          const paletteIsLocked = applet.config?.locked === true;

                          // Debug logging for palette cleanser
                          console.log('Debug - Palette Cleanser State:', {
                            appletId: applet.id,
                            name: applet.name,
                            user_started_at: applet.user_started_at,
                            user_completed_at: applet.user_completed_at,
                            isInProgress,
                            isAppletCompleted,
                            paletteIsLocked,
                            buttonStateWillBe: isAppletCompleted && paletteIsLocked ? 'completed-locked' :
                                               isAppletCompleted && !paletteIsLocked ? 'user-complete-editable' :
                                               isInProgress && !paletteIsLocked ? 'in-progress-editing' :
                                               paletteIsLocked ? 'locked' : 'available'
                          });

                          if (isAppletCompleted && paletteIsLocked) {
                            buttonState = 'completed-locked';
                            statusMessage = completionDate ?
                              `Palette submitted on ${completionDate} • Locked` :
                              'Palette preferences submitted & locked. No longer accepting changes.';
                          } else if (isAppletCompleted && !paletteIsLocked) {
                            buttonState = 'user-complete-editable';
                            statusMessage = completionDate ?
                              `Submitted on ${completionDate} • Click to edit` :
                              'Palette preferences submitted! We are still gathering other inputs. Want to make a change? Click the pencil icon.';
                          } else if (isInProgress && !paletteIsLocked) {
                            buttonState = 'in-progress-editing';
                            statusMessage = 'Continue editing your palette preferences';
                          } else if (paletteIsLocked) {
                            buttonState = 'locked';
                            statusMessage = 'Palette discovery closed to new responses';
                          }
                        } else if (isAppletCompleted) {
                          buttonState = 'completed';
                          statusMessage = completionDate ?
                            `Completed on ${completionDate}` : null;
                        } else if (isInProgress) {
                          // Generic in-progress state for any applet type that doesn't have specific handling
                          buttonState = 'in-progress-editing';
                          statusMessage = 'Resume where you left off';
                        }

                        return (
                          <button
                            key={applet.id}
                            onClick={() => handleAppletClick(applet, projectlet, buttonState === 'completed-locked')}
                            disabled={buttonState === 'locked' || (buttonState === 'completed' && applet.type !== 'link_submission' && applet.type !== 'upload' && applet.type !== 'file_upload' && applet.type !== 'palette_cleanser' && applet.type !== 'tone_of_voice')}
                            className={`w-full p-4 rounded-lg border-2 transition-all ${
                              buttonState === 'completed-locked'
                                ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
                                : buttonState === 'user-complete-editable'
                                ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
                                : buttonState === 'in-progress-editing'
                                ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-md cursor-pointer'
                                : buttonState === 'link-completed'
                                ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
                                : buttonState === 'file-completed'
                                ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
                                : buttonState === 'locked'
                                ? 'bg-gray-50 border-gray-300 cursor-default opacity-75'
                                : buttonState === 'completed'
                                ? 'bg-green-50 border-green-300 cursor-default'
                                : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${
                                  buttonState === 'completed-locked' || buttonState === 'user-complete-editable' || buttonState === 'link-completed' ? 'bg-green-100' :
                                  buttonState === 'file-completed' ? 'bg-green-100' :
                                  buttonState === 'in-progress-editing' ? 'bg-yellow-100' :
                                  buttonState === 'locked' ? 'bg-gray-100' :
                                  buttonState === 'completed' ? 'bg-green-100' :
                                  'bg-purple-100'
                                }`}>
                                  {buttonState === 'completed-locked' || buttonState === 'user-complete-editable' || buttonState === 'completed' || buttonState === 'link-completed' || buttonState === 'file-completed' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : buttonState === 'in-progress-editing' ? (
                                    <Edit2 className="w-5 h-5 text-yellow-600" />
                                  ) : buttonState === 'locked' ? (
                                    <Lock className="w-5 h-5 text-gray-600" />
                                  ) : (
                                    <Icon className="w-5 h-5 text-purple-600" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="font-medium">
                                    {applet.type === 'form' && applet.form?.title 
                                      ? applet.form.title 
                                      : applet.type === 'link_submission' && applet.config?.heading
                                      ? applet.config.heading
                                      : (applet.type === 'upload' || applet.type === 'file_upload') && applet.config?.heading
                                      ? applet.config.heading
                                      : applet.name}
                                  </p>
                                  {statusMessage ? (
                                    <p className="text-sm text-gray-600 italic">{statusMessage}</p>
                                  ) : applet.client_instructions ? (
                                    <p className="text-sm text-gray-600">{applet.client_instructions}</p>
                                  ) : null}
                                </div>
                              </div>
                              
                              {buttonState === 'locked' ? (
                                <Lock className="w-5 h-5 text-gray-500" />
                              ) : buttonState === 'user-complete-editable' ? (
                                <Edit2 className="w-5 h-5 text-green-600" />
                              ) : buttonState === 'completed-locked' ? (
                                <Eye className="w-5 h-5 text-green-600" />
                              ) : buttonState === 'link-completed' ? (
                                <Eye className="w-5 h-5 text-green-600" />
                              ) : buttonState === 'file-completed' ? (
                                <Eye className="w-5 h-5 text-green-600" />
                              ) : buttonState === 'completed' ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              ) : buttonState === 'in-progress-editing' ? (
                                <div className="text-purple-600">
                                  Resume →
                                </div>
                              ) : (
                                <div className="text-purple-600">
                                  {(() => {
                                    console.log(`Final button text for ${applet.name}:`, {
                                      buttonState,
                                      type: applet.type,
                                      isInProgress: applet.user_started_at && !applet.user_completed_at
                                    });
                                    // Check if applet is in progress (started but not completed)
                                    const isInProgress = applet.user_started_at && !applet.user_completed_at;
                                    if (isInProgress) {
                                      return 'Resume →';
                                    }
                                    return (applet.type === 'upload' || applet.type === 'file_upload') ? 'Review Files →' : 'Start →';
                                  })()}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        ) : activeTab === 'files' ? (
          /* File Repository */
          <div className="bg-white rounded-xl shadow-sm p-6">
            <EnhancedFileRepository
              projectId={params.projectId}
              canUpload={true}
              canDelete={true}
              canCreateFolders={true}
            />
          </div>
        ) : null}
      </div>

      {/* Form Modal */}
      {showFormModal && formData && (
        <FormModal
          form={formData}
          onSubmit={handleFormSubmit}
          onClose={() => {
            // Save progress when closing
            if (selectedApplet?.form_id) {
              // Progress is automatically saved via onProgressUpdate
            }
            setShowFormModal(false);
            setIsFormViewOnly(false); // Reset view-only mode when closing
          }}
          savedProgress={formProgress[selectedApplet?.form_id]}
          onProgressUpdate={null}
          isViewOnly={isFormViewOnly}
        />
      )}

      {/* Link Submission Modal */}
      {showLinkSubmissionModal && selectedApplet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {selectedApplet.config?.heading || 'Links & Resources'}
                </h2>
                <button
                  onClick={() => setShowLinkSubmissionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {selectedApplet.config?.description && (
                <p className="mt-2 text-gray-600">{selectedApplet.config.description}</p>
              )}
            </div>
            
            <div className="p-6">
              {selectedApplet.config?.links && selectedApplet.config.links.length > 0 ? (
                <div className="space-y-4">
                  {selectedApplet.config.links.map((link, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start space-x-3 group"
                      >
                        <ExternalLink className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0 group-hover:text-blue-700" />
                        <div className="flex-1">
                          <p className="font-medium text-blue-600 group-hover:text-blue-700 group-hover:underline">
                            {link.text || 'View Link'}
                          </p>
                          {link.description && (
                            <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                          )}
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No links available yet.</p>
              )}
              
              {selectedApplet.config?.allow_client_acknowledgment && (
                <div className="mt-6 pt-6 border-t">
                  {completedApplets.has(selectedApplet.id) || selectedApplet.user_status === 'completed' ? (
                    <div className="w-full py-3 bg-green-100 text-green-700 rounded-lg text-center font-medium border border-green-300">
                      ✓ Marked as Reviewed on {selectedApplet.user_completed_at ? 
                        new Date(selectedApplet.user_completed_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        }) : 
                        'Recently'
                      }
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        // Mark as acknowledged
                        await fetch(`/api/aloa-projects/${params.projectId}/client-view`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            appletId: selectedApplet.id,
                            status: 'completed',
                            interactionType: 'completion',
                            userId: userId,
                            data: { acknowledged: true, acknowledgedAt: new Date().toISOString() }
                          })
                        });
                        
                        // Update local state
                        setCompletedApplets(prev => new Set([...prev, selectedApplet.id]));
                        setShowLinkSubmissionModal(false);
                        
                        // Trigger confetti celebration
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 7000);
                        
                        // Refresh project data
                        fetchProjectData();
                      }}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Mark as Reviewed
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUploadModal && selectedApplet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {selectedApplet.config?.heading || 'File Downloads'}
                </h2>
                <button
                  onClick={() => setShowFileUploadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              {selectedApplet.config?.description && (
                <p className="mt-2 text-gray-600">{selectedApplet.config.description}</p>
              )}
            </div>

            <div className="p-6">
              {(() => {
                // Parse files array from config if it's a string
                // Note: Files can be in config.files OR config.attached_files
                let filesArray = [];
                const filesField = selectedApplet?.config?.files || selectedApplet?.config?.attached_files;

                if (filesField) {
                  if (typeof filesField === 'string') {
                    try {
                      filesArray = JSON.parse(filesField);
                    } catch (e) {
                      console.error('Failed to parse files:', e);
                    }
                  } else if (Array.isArray(filesField)) {
                    filesArray = filesField;
                  }
                }

                console.log('Debug - File Upload Modal Data:', {
                  appletId: selectedApplet?.id,
                  appletName: selectedApplet?.name,
                  config: selectedApplet?.config,
                  rawFiles: selectedApplet?.config?.files,
                  parsedFiles: filesArray,
                  filesLength: filesArray?.length,
                  filesType: typeof selectedApplet?.config?.files
                });

                return filesArray && filesArray.length > 0 ? (
                <div className="space-y-3">
                  {filesArray.map((file, idx) => {
                    // Handle different file structures
                    if (!file || typeof file !== 'object') {
                      console.log('Debug - Invalid file object:', file);
                      return null;
                    }
                    const getFileIcon = (fileName) => {
                      if (!fileName || typeof fileName !== 'string') return '📎';
                      const ext = fileName.split('.').pop().toLowerCase();
                      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
                      const docExts = ['pdf', 'doc', 'docx', 'txt'];

                      if (imageExts.includes(ext)) return '🖼️';
                      if (docExts.includes(ext)) return '📄';
                      if (ext === 'zip' || ext === 'rar') return '📦';
                      return '📎';
                    };
                    
                    const formatFileSize = (bytes) => {
                      if (!bytes || bytes === 0) return '0 Bytes';
                      const k = 1024;
                      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                    };
                    
                    return (
                      <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getFileIcon(file.file_name || file.name)}</span>
                            <div>
                              <p className="font-medium text-gray-900">
                                {file.file_name || file.name || 'Unnamed File'}
                                {file.category === 'final-deliverables' && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Final</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.file_size || file.size)} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                                {file.storage_type === 'supabase' && (
                                  <span className="ml-2 text-blue-600">☁️ Cloud</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              // Track download
                              if (file.id) {
                                try {
                                  await fetch('/api/project-files', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: file.id, increment_download: true })
                                  });
                                } catch (err) {
                                  console.log('Download tracking failed:', err);
                                }
                              }
                              
                              // Handle different storage types
                              if (file.storage_type === 'supabase' && file.url) {
                                // Supabase Storage file
                                window.open(file.url, '_blank');
                              } 
                              else if (file.url && !file.data) {
                                // Legacy URL file
                                window.open(file.url, '_blank');
                              } 
                              else if (file.data) {
                                // Base64 data
                                const link = document.createElement('a');
                                link.href = file.data;
                                link.download = file.name;
                                link.click();
                              }
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Mark as Reviewed Button */}
                  {!completedApplets.has(selectedApplet.id) && (
                    <button
                      onClick={async () => {
                        // Mark applet as completed
                        const response = await fetch(`/api/aloa-projects/${params.projectId}/client-view`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            appletId: selectedApplet.id,
                            userId: userId,
                            status: 'completed',
                            interactionType: 'file_review',
                            data: {
                              acknowledgedAt: new Date().toISOString()
                            }
                          })
                        });

                        if (!response.ok) {
                          console.error('Failed to update applet progress');
                        }
                        
                        // Update local state immediately
                        setCompletedApplets(prev => new Set([...prev, selectedApplet.id]));

                        // Update the selected applet to show completion
                        const updatedApplet = {
                          ...selectedApplet,
                          user_progress: [{
                            status: 'completed',
                            completedAt: new Date().toISOString()
                          }]
                        };
                        setSelectedApplet(updatedApplet);

                        // Trigger confetti celebration
                        setShowConfetti(true);

                        // Wait a moment for the user to see the success, then close modal
                        setTimeout(() => {
                          setShowConfetti(false);
                          setShowFileUploadModal(false);
                          // Don't refresh project data here as it will reset local state
                          // The completion is already tracked locally
                        }, 3000);
                      }}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium mt-4"
                    >
                      Mark Files as Reviewed
                    </button>
                  )}
                  
                  {/* Show when already reviewed */}
                  {completedApplets.has(selectedApplet.id) && (
                    <div className="text-center py-3 bg-green-50 text-green-700 rounded-lg font-medium">
                      ✓ Files reviewed on {new Date().toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No files available yet</p>
                  <p className="text-sm mt-1">Check back later for project files</p>
                </div>
              );
              })()}
              
              {/* Allow client upload if enabled */}
              {selectedApplet.config?.allow_client_upload && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-3">You can upload files too:</p>
                  <label className="relative">
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        // TODO: Implement client file upload
                        alert('Client file upload coming soon!');
                      }}
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload file</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Max {selectedApplet.config.max_file_size || 10}MB
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Palette Cleanser Modal */}
      {showPaletteCleanserModal && selectedApplet && (
        <PaletteCleanserModal
          applet={selectedApplet}
          projectId={params.projectId}
          userId={userId}
          isViewOnly={isPaletteCleanserViewOnly}
          onClose={() => {
            setShowPaletteCleanserModal(false);
            setIsPaletteCleanserViewOnly(false);
          }}
          onComplete={async (data) => {
            // Update local state to show completion
            setCompletedApplets(prev => new Set([...prev, selectedApplet.id]));

            // Trigger confetti
            setShowConfetti(true);
            setTimeout(() => {
              setShowConfetti(false);
              setShowPaletteCleanserModal(false);
              setIsPaletteCleanserViewOnly(false);
              fetchProjectData(); // Refresh project data
            }, 1500);
          }}
        />
      )}

      {/* Sitemap Modal */}
      {showSitemapModal && selectedApplet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedApplet.name || 'Sitemap Builder'}</h2>
              <button
                onClick={() => setShowSitemapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <SitemapBuilder
                key={selectedApplet.id + '-' + JSON.stringify(selectedApplet.config?.sitemap_data || {}).substring(0, 10)}
                config={selectedApplet.config || {}}
                projectScope={project?.metadata?.scope || { main_pages: 5, aux_pages: 5 }}
                isLocked={isSitemapViewOnly}
                initialData={selectedApplet.config?.sitemap_data}
                appletId={selectedApplet.id}
                projectId={params.projectId}
                userId={userId}
                websiteUrl={project?.metadata?.website_url}
                onAutoSave={async (sitemapData) => {
                  // Auto-save progress
                  console.log('onAutoSave called with:', sitemapData);
                  try {
                    const response = await fetch(`/api/aloa-applets/${selectedApplet.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        config: {
                          ...selectedApplet.config,
                          sitemap_data: sitemapData
                        }
                      })
                    });

                    if (!response.ok) {
                      console.error('Auto-save failed - API returned:', response.status);
                      throw new Error(`API error: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('Auto-save API call successful, response:', result);

                    // Update the selectedApplet with the new config
                    if (result.applet) {
                      console.log('Updating selectedApplet with new config:', result.applet.config);
                      setSelectedApplet(prevApplet => ({
                        ...prevApplet,
                        config: {
                          ...prevApplet.config,
                          sitemap_data: sitemapData
                        }
                      }));

                      // Also update in the projectlets array to ensure persistence
                      setProjectlets(prev => prev.map(projectlet => ({
                        ...projectlet,
                        applets: projectlet.applets?.map(a =>
                          a.id === selectedApplet.id
                            ? { ...a, config: { ...a.config, sitemap_data: sitemapData } }
                            : a
                        ) || []
                      })));
                    }

                    // Mark as in progress if not already
                    if (!completedApplets.has(selectedApplet.id)) {
                      await fetch(`/api/aloa-projects/${params.projectId}/client-view`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          appletId: selectedApplet.id,
                          status: 'in_progress',
                          interactionType: 'sitemap_edit',
                          data: { sitemap_data: sitemapData },
                          userId: userId
                        })
                      });
                    }
                  } catch (error) {
                    console.error('Auto-save failed:', error);
                  }
                }}
                onSave={async (sitemapData) => {
                  try {
                    // Save the sitemap data
                    const response = await fetch(`/api/aloa-applets/${selectedApplet.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        config: {
                          ...selectedApplet.config,
                          sitemap_data: sitemapData
                        }
                      })
                    });

                    if (response.ok) {
                      // Mark as completed
                      await fetch(`/api/aloa-projects/${params.projectId}/client-view`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          appletId: selectedApplet.id,
                          status: 'completed',
                          interactionType: 'sitemap_save',
                          data: { sitemap_data: sitemapData },
                          userId: userId
                        })
                      });

                      // Update local state
                      setCompletedApplets(prev => new Set([...prev, selectedApplet.id]));

                      // Show success with confetti
                      setShowConfetti(true);
                      setTimeout(() => {
                        setShowConfetti(false);
                        setShowSitemapModal(false);
                        fetchProjectData(); // Refresh project data
                      }, 1500);
                    }
                  } catch (error) {
                    console.error('Error saving sitemap:', error);
                    alert('Failed to save sitemap. Please try again.');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tone of Voice Modal */}
      {showToneOfVoiceModal && selectedApplet && (
        <ToneOfVoiceSelector
          applet={selectedApplet}
          projectId={params.projectId}
          userId={userId}
          isViewOnly={isToneOfVoiceViewOnly}
          onClose={() => {
            setShowToneOfVoiceModal(false);
            setIsToneOfVoiceViewOnly(false);
            // Refresh to show updated state
            fetchProjectData();
          }}
          onComplete={() => {
            // Update local state
            setCompletedApplets(prev => new Set([...prev, selectedApplet.id]));

            // Trigger confetti celebration
            setShowConfetti(true);
            setTimeout(() => {
              setShowConfetti(false);
              setShowToneOfVoiceModal(false);
              setIsToneOfVoiceViewOnly(false);
              // Refresh to show updated state
              fetchProjectData();
            }, 1500);
          }}
        />
      )}

      {/* Client Review Modal */}
      {showClientReviewModal && selectedApplet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ClientReview
              applet={selectedApplet}
              projectId={params.projectId}
              userId={userId}
              userRole={userRole}
              isViewOnly={isClientReviewViewOnly}
              onClose={() => {
                setShowClientReviewModal(false);
                setIsClientReviewViewOnly(false);
                fetchProjectData();
              }}
              onComplete={() => {
                // Note: ClientReview handles its own confetti for approval
                // Just refresh data here
                setShowClientReviewModal(false);
                setIsClientReviewViewOnly(false);
                fetchProjectData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Form Modal Component - Using MultiStepFormRenderer
function FormModal({ form, onSubmit, onClose, savedProgress, onProgressUpdate, isViewOnly = false }) {
  // Create a custom onSubmit handler that works with MultiStepFormRenderer
  const handleFormComplete = async (responses) => {
    // Transform responses to match expected format
    const transformedResponses = {};
    Object.keys(responses).forEach(key => {
      transformedResponses[key] = responses[key];
    });
    
    // Call the parent onSubmit handler
    await onSubmit(transformedResponses);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-lg z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-6">
            <MultiStepFormRenderer 
              form={form} 
              isModal={true}
              onComplete={handleFormComplete}
              initialData={savedProgress?.data}
              initialSection={savedProgress?.section}
              onProgressChange={onProgressUpdate}
              isViewOnly={isViewOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  return (
    <AuthGuard 
      requireAuth={true} 
      allowedRoles={['client', 'client_admin', 'client_participant', 'super_admin', 'project_admin', 'team_member']}
      redirectTo="/auth/login"
    >
      <ClientDashboard />
    </AuthGuard>
  );
}