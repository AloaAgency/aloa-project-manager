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
  Star,
  Trophy,
  Target,
  Zap,
  X,
  Edit2,
  ExternalLink,
  Link,
  Download,
  File
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';
import AuthGuard from '@/components/AuthGuard';
import useEscapeKey from '@/hooks/useEscapeKey';
import { createClient } from '@/lib/supabase-browser';

// Dynamic imports for heavy components
const ConfettiCelebration = dynamic(() => import('@/components/ConfettiCelebration'), { ssr: false });

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

  useEffect(() => {
    // Get authenticated user's ID
    const getAuthenticatedUser = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
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
    const formId = applet.form_id || applet.config?.form_id;
    const formIsLocked = isForm && applet.form?.status === 'closed';
    const userHasCompleted = isForm && formId ? userFormResponses[formId] : completedApplets.has(applet.id);

    // Block if:
    // 1. Non-form, non-link-submission, non-file-upload applet that's already completed
    // 2. Form that's locked and user hasn't submitted (can't start new)
    // Link submissions and file uploads should always be viewable even after completion
    if ((!isForm && !isLinkSubmission && !isFileUpload && userHasCompleted) || (isForm && formIsLocked && !userHasCompleted)) {
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
      setSelectedApplet({ ...applet, projectlet });
      setShowFileUploadModal(true);
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
      content_gather: MessageSquare
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

        {/* Projectlets Timeline */}
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
                        } else if (isAppletCompleted) {
                          buttonState = 'completed';
                          statusMessage = completionDate ?
                            `Completed on ${completionDate}` : null;
                        }
                        
                        return (
                          <button
                            key={applet.id}
                            onClick={() => handleAppletClick(applet, projectlet, buttonState === 'completed-locked')}
                            disabled={buttonState === 'locked' || (buttonState === 'completed' && applet.type !== 'link_submission' && applet.type !== 'upload' && applet.type !== 'file_upload')}
                            className={`w-full p-4 rounded-lg border-2 transition-all ${
                              buttonState === 'completed-locked'
                                ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
                                : buttonState === 'user-complete-editable'
                                ? 'bg-green-50 border-green-300 hover:border-green-400 hover:shadow-md cursor-pointer'
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
                                  buttonState === 'locked' ? 'bg-gray-100' :
                                  buttonState === 'completed' ? 'bg-green-100' : 
                                  'bg-purple-100'
                                }`}>
                                  {buttonState === 'completed-locked' || buttonState === 'user-complete-editable' || buttonState === 'completed' || buttonState === 'link-completed' || buttonState === 'file-completed' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
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
                              ) : (
                                <div className="text-purple-600">
                                  {(applet.type === 'upload' || applet.type === 'file_upload') ? 'Review Files →' : 'Start →'}
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
              {selectedApplet.config?.files && selectedApplet.config.files.length > 0 ? (
                <div className="space-y-3">
                  {selectedApplet.config.files.map((file, idx) => {
                    const getFileIcon = (fileName) => {
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
                            <span className="text-2xl">{getFileIcon(file.name)}</span>
                            <div>
                              <p className="font-medium text-gray-900">
                                {file.name}
                                {file.category === 'final-deliverables' && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Final</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
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
              )}
              
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
      allowedRoles={['client', 'super_admin', 'project_admin', 'team_member']}
      redirectTo="/auth/login"
    >
      <ClientDashboard />
    </AuthGuard>
  );
}