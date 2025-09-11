'use client';

/**
 * ClientAppletRenderer - Client Interface for Applet Interaction
 * 
 * This component handles the CLIENT SIDE of applets - what clients
 * see and interact with to complete their project tasks.
 * 
 * Each applet type renders differently based on its configuration:
 * - Form: Shows the form to fill out with submit button
 * - Upload: Shows upload interface with requirements
 * - Review: Shows content to review with approval buttons
 * - Signoff: Shows agreement text with signature field
 * - Moodboard: Shows options to select preferences
 * - Content Gather: Shows fields to provide content
 * 
 * The component tracks completion status and reports back to the system
 * when clients complete their required actions.
 */

import { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Eye, 
  CheckCircle, 
  Palette, 
  MessageSquare,
  Loader2,
  Check,
  X
} from 'lucide-react';

const APPLET_ICONS = {
  form: FileText,
  review: Eye,
  upload: Upload,
  signoff: CheckCircle,
  moodboard: Palette,
  content_gather: MessageSquare
};

export default function ClientAppletRenderer({ 
  applet, 
  projectId, 
  onComplete,
  isReadOnly = false 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(applet.status === 'completed');
  
  const Icon = APPLET_ICONS[applet.type] || FileText;

  // Handle completion of applet action
  const handleComplete = async (data = {}) => {
    setIsLoading(true);
    try {
      // Record the interaction
      const response = await fetch(
        `/api/aloa-projects/${projectId}/applets/${applet.id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completion_data: data,
            completed_at: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        setIsCompleted(true);
        if (onComplete) {
          onComplete(applet.id);
        }
      }
    } catch (error) {
      console.error('Error completing applet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render based on applet type
  const renderAppletContent = () => {
    switch (applet.type) {
      case 'form':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Complete Required Form
              </h4>
              <p className="text-sm text-blue-700">
                {applet.client_instructions || 'Please fill out the form below to proceed.'}
              </p>
            </div>
            
            {applet.form_id ? (
              <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                <a
                  href={`/forms/${applet.form?.url_id || applet.form_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Open Form
                </a>
                <p className="text-sm text-gray-600 mt-3">
                  Click the button above to open and complete the form in a new tab.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-500">Form not yet configured</p>
              </div>
            )}
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">
                Upload Required Files
              </h4>
              <p className="text-sm text-green-700">
                {applet.client_instructions || 'Please upload the required files below.'}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border-2 border-dashed border-gray-300 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">
                Drag and drop files here or click to browse
              </p>
              <button
                onClick={() => handleComplete({ uploaded: true })}
                disabled={isLoading}
                className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">
                Review and Approve
              </h4>
              <p className="text-sm text-purple-700">
                {applet.client_instructions || 'Please review the content and provide your approval.'}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
              <div className="space-y-4">
                {/* Content to review would go here */}
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-gray-600">Review content will be displayed here</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleComplete({ approved: true })}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-5 h-5 inline mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleComplete({ approved: false, requested_changes: true })}
                    disabled={isLoading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <X className="w-5 h-5 inline mr-2" />
                    Request Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'signoff':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">
                Final Approval Required
              </h4>
              <p className="text-sm text-red-700">
                {applet.client_instructions || 'Please provide your final approval to proceed.'}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">
                    By signing off, you confirm that all requirements have been met
                    and approve moving forward with the next phase.
                  </p>
                </div>
                
                <button
                  onClick={() => handleComplete({ signed_off: true, timestamp: new Date().toISOString() })}
                  disabled={isLoading || isCompleted}
                  className="w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                      Signed Off
                    </>
                  ) : (
                    'Provide Sign-off'
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">
              This applet type ({applet.type}) is not yet implemented
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              isCompleted ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Icon className={`w-6 h-6 ${
                isCompleted ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="font-bold text-lg">{applet.name}</h3>
              {applet.description && (
                <p className="text-gray-600 text-sm mt-1">{applet.description}</p>
              )}
              {isCompleted && (
                <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isReadOnly ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <p>This step has been completed</p>
          </div>
        ) : (
          renderAppletContent()
        )}
      </div>

      {/* Progress Bar */}
      {applet.completion_percentage !== undefined && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${applet.completion_percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {applet.completion_percentage}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}