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
  X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';

// Dynamic imports for heavy components
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

export default function ClientDashboard() {
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

  useEffect(() => {
    // Generate or retrieve user ID
    const storedUserId = localStorage.getItem('client_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      // Generate a unique ID for this client session
      const newUserId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('client_user_id', newUserId);
      setUserId(newUserId);
    }
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
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppletClick = async (applet, projectlet) => {
    if (completedApplets.has(applet.id)) {
      return; // Already completed
    }

    // Mark applet as in progress for this user
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

    if (applet.type === 'form') {
      // Check for form_id in multiple places
      const formId = applet.form_id || applet.config?.form_id;
      
      if (!formId) {
        console.error('No form_id found for applet:', applet);
        alert('This form is not properly configured. Please contact support.');
        return;
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
          setShowFormModal(true);
        } catch (error) {
          console.error('Error fetching form:', error);
          alert('Unable to load the form. Please try again later.');
        }
      }
    }
  };

  const handleFormSubmit = async (responses) => {
    try {
      // Get CSRF token (generate a simple one for now)
      const csrfToken = Math.random().toString(36).substring(2);
      document.cookie = `csrf-token=${csrfToken}; path=/`;

      // Submit form response with project ID
      const responseResult = await fetch('/api/aloa-responses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          formId: selectedApplet.form_id || selectedApplet.form?.id,
          projectId: params.projectId,  // Include the project ID
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
      
      // Clear saved progress for this form since it's completed
      if (selectedApplet.form_id) {
        setFormProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[selectedApplet.form_id];
          return newProgress;
        });
      }

      // Close modal and show celebration
      setShowFormModal(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);

      // Refresh data
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
      {showConfetti && <Confetti />}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
                <p className="text-sm text-gray-600">Your Project Dashboard</p>
              </div>
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
                <p className="text-2xl font-bold">{completedApplets.size}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">
                  {projectlets.filter(p => p.status === 'in_progress').length}
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
            
            return (
              <div
                key={projectlet.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                  isLocked ? 'opacity-60' : ''
                }`}
              >
                {/* Projectlet Header */}
                <div className={`p-6 border-b ${
                  isCompleted ? 'bg-green-50' : isLocked ? 'bg-gray-50' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-100 text-green-600' :
                        isLocked ? 'bg-gray-100 text-gray-400' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {isCompleted ? <CheckCircle /> : 
                         isLocked ? <Lock /> : 
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
                  <div className="p-6">
                    <div className="space-y-3">
                      {applets.map(applet => {
                        const Icon = getAppletIcon(applet.type);
                        const isAppletCompleted = completedApplets.has(applet.id);
                        
                        return (
                          <button
                            key={applet.id}
                            onClick={() => handleAppletClick(applet, projectlet)}
                            disabled={isAppletCompleted}
                            className={`w-full p-4 rounded-lg border-2 transition-all ${
                              isAppletCompleted 
                                ? 'bg-green-50 border-green-300 cursor-default'
                                : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${
                                  isAppletCompleted ? 'bg-green-100' : 'bg-purple-100'
                                }`}>
                                  <Icon className={`w-5 h-5 ${
                                    isAppletCompleted ? 'text-green-600' : 'text-purple-600'
                                  }`} />
                                </div>
                                <div className="text-left">
                                  <p className="font-medium">
                                    {applet.type === 'form' && applet.form?.title 
                                      ? applet.form.title 
                                      : applet.name}
                                  </p>
                                  {applet.client_instructions && (
                                    <p className="text-sm text-gray-600">{applet.client_instructions}</p>
                                  )}
                                </div>
                              </div>
                              
                              {isAppletCompleted ? (
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              ) : (
                                <div className="text-purple-600">
                                  Start →
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
          }}
          savedProgress={formProgress[selectedApplet?.form_id]}
          onProgressUpdate={null}
        />
      )}
    </div>
  );
}

// Form Modal Component - Using MultiStepFormRenderer
function FormModal({ form, onSubmit, onClose, savedProgress, onProgressUpdate }) {
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}