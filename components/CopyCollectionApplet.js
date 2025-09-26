'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Edit3, CheckCircle, Eye, Download, Trash2, AlertCircle } from 'lucide-react';
import MultiStepFormRenderer from '@/components/MultiStepFormRenderer';
import toast from 'react-hot-toast';

export default function CopyCollectionApplet({
  applet,
  isViewOnly,
  onClose,
  onComplete,
  projectId,
  userId
}) {
  // State for the component
  const [mode, setMode] = useState(null); // null, 'upload', 'form'
  const [uploadedContent, setUploadedContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const fileInputRef = useRef(null);

  // Load saved progress on mount
  useEffect(() => {
    if (applet.form_progress) {
      const progress = applet.form_progress;
      if (progress.mode) {
        setMode(progress.mode);
      }
      if (progress.uploadedContent) {
        setUploadedContent(progress.uploadedContent);
      }
      if (progress.uploadedFileName) {
        setUploadedFileName(progress.uploadedFileName);
      }
      if (progress.formId) {
        // Load form data if available
        loadFormData(progress.formId);
      }
    }
  }, [applet]);

  // Load form data
  const loadFormData = async (formId) => {
    try {
      const response = await fetch(`/api/forms/${formId}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading form:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['.txt', '.doc', '.docx', '.md'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Please upload a text file (.txt, .doc, .docx, or .md)');
      return;
    }

    setLoading(true);
    setSaveStatus('Uploading file...');

    try {
      let content = '';
      let fileRecord = null;

      // Get user info for naming the file
      const userResponse = await fetch('/api/auth/profile');
      const userData = userResponse.ok ? await userResponse.json() : null;
      const stakeholderName = userData?.full_name || userData?.email || 'Unknown User';

      // Format date for file naming
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const appletName = applet.name || 'Copy Collection';
      const safeName = stakeholderName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeAppletName = appletName.replace(/[^a-zA-Z0-9]/g, '_');

      // Create custom file name
      const customFileName = `${date}_${safeAppletName}_${safeName}_${file.name}`;

      if (fileExtension === '.txt' || fileExtension === '.md') {
        // Read text files directly
        content = await file.text();
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        // For Word documents, we'll need to send to server for processing
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to process document');
        }

        const result = await response.json();
        content = result.content;
      }

      // Upload file to project repository
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      const fileToUpload = new File([blob], customFileName, { type: file.type });

      formData.append('file', fileToUpload);
      formData.append('project_id', projectId);
      formData.append('category', 'copy_collection');
      formData.append('description', `Copy collection upload from ${stakeholderName}`);
      formData.append('tags', JSON.stringify(['copy', 'content', applet.name]));

      const uploadResponse = await fetch('/api/project-files', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        fileRecord = uploadResult.file;
      }

      setUploadedContent(content);
      setUploadedFileName(file.name);
      setSaveStatus('');
      toast.success('File uploaded successfully!');

      // Save progress with file reference
      await saveProgress({
        mode: 'upload',
        uploadedContent: content,
        uploadedFileName: file.name,
        fileId: fileRecord?.id,
        fileUrl: fileRecord?.url
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
      setSaveStatus('');
    } finally {
      setLoading(false);
    }
  };

  // Handle text paste
  const handleTextPaste = async (text) => {
    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setUploadedContent(text);
    setUploadedFileName('Pasted Text');
    toast.success('Text saved successfully!');

    // Save progress
    await saveProgress({
      mode: 'upload',
      uploadedContent: text,
      uploadedFileName: 'Pasted Text'
    });
  };

  // Save progress to database
  const saveProgress = async (data) => {
    try {
      setSaveStatus('Saving...');

      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: data.uploadedContent || data.formCompleted ? 'completed' : 'in_progress',
          interactionType: 'copy_collection_progress',
          userId: userId,
          data: {
            form_progress: {
              ...data,
              userId
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);

      // If completed, trigger confetti
      if (data.uploadedContent || data.formCompleted) {
        if (onComplete) {
          onComplete();
        }
      }

    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save progress');
      setSaveStatus('');
    }
  };

  // Handle form completion
  const handleFormComplete = async () => {
    await saveProgress({
      mode: 'form',
      formCompleted: true,
      formId: applet.config?.formId
    });
  };

  // Render mode selection
  const renderModeSelection = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            How would you like to provide copy for this page?
          </h3>
          <p className="text-gray-600">
            Choose the option that works best for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload Option */}
          <button
            onClick={() => setMode('upload')}
            className="relative p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="absolute top-3 right-3">
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                PREFERRED
              </span>
            </div>
            <Upload className="w-12 h-12 text-blue-600 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Existing Copy
            </h4>
            <p className="text-sm text-gray-600">
              Upload a document or paste your existing copy directly
            </p>
          </button>

          {/* Form Option */}
          <button
            onClick={() => {
              if (applet.config?.formId) {
                loadFormData(applet.config.formId);
              }
              setMode('form');
            }}
            className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <FileText className="w-12 h-12 text-purple-600 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Fill Out Form
            </h4>
            <p className="text-sm text-gray-600">
              Answer questions to help us create copy for you
            </p>
          </button>
        </div>
      </div>
    );
  };

  // Render upload interface
  const renderUploadInterface = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            Upload or Paste Your Copy
          </h3>
          {!isViewOnly && (
            <button
              onClick={() => {
                setMode(null);
                setUploadedContent('');
                setUploadedFileName('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change method
            </button>
          )}
        </div>

        {uploadedContent ? (
          // Show uploaded content
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">
                    Content Uploaded
                  </span>
                </div>
                {!isViewOnly && (
                  <button
                    onClick={() => {
                      setUploadedContent('');
                      setUploadedFileName('');
                      saveProgress({ mode: 'upload', uploadedContent: '', uploadedFileName: '' });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                File: {uploadedFileName}
              </p>
              <div className="bg-white rounded p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {uploadedContent}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          // Show upload options
          <div className="space-y-6">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.doc,.docx,.md"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading || isViewOnly}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || isViewOnly}
                className="w-full flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 rounded-lg p-4 transition-colors disabled:opacity-50"
              >
                <Upload className="w-10 h-10 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Click to upload a file
                </span>
                <span className="text-xs text-gray-500">
                  Supports .txt, .doc, .docx, .md files
                </span>
              </button>
            </div>

            {/* Text Paste */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or paste your copy directly
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={8}
                placeholder="Paste your copy here..."
                disabled={isViewOnly}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    handleTextPaste(e.target.value);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Save status indicator */}
        {saveStatus && (
          <div className="text-sm text-gray-600 italic">
            {saveStatus}
          </div>
        )}
      </div>
    );
  };

  // Render form interface
  const renderFormInterface = () => {
    if (!formData) {
      if (applet.config?.formId) {
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading form...</p>
          </div>
        );
      } else {
        return (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No form has been configured for this applet yet.</p>
            {!isViewOnly && (
              <button
                onClick={() => setMode(null)}
                className="text-blue-600 hover:text-blue-700"
              >
                Choose a different method
              </button>
            )}
          </div>
        );
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Fill Out Copy Generation Form
          </h3>
          {!isViewOnly && (
            <button
              onClick={() => {
                setMode(null);
                setFormData(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change method
            </button>
          )}
        </div>

        <MultiStepFormRenderer
          form={formData}
          onComplete={handleFormComplete}
          isReadOnly={isViewOnly}
          existingResponse={applet.form_progress?.formResponse}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Edit3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {applet.name || 'Copy Collection'}
              </h2>
              <p className="text-sm text-gray-600">
                {applet.config?.description || 'Provide copy for your webpage'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isViewOnly ? (
            // View-only mode
            <div className="space-y-4">
              {applet.form_progress?.mode === 'upload' && applet.form_progress?.uploadedContent ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Copy Submitted</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      File: {applet.form_progress.uploadedFileName}
                    </p>
                    <div className="bg-white rounded p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {applet.form_progress.uploadedContent}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : applet.form_progress?.mode === 'form' && applet.form_progress?.formCompleted ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Form Completed</span>
                  </div>
                  <p className="text-gray-600">
                    The copy generation form has been completed. Our team will use your responses to create custom copy for this page.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    This applet is currently locked. No copy has been submitted yet.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Interactive mode
            <>
              {!mode && renderModeSelection()}
              {mode === 'upload' && renderUploadInterface()}
              {mode === 'form' && renderFormInterface()}
            </>
          )}
        </div>

        {/* Footer */}
        {!isViewOnly && (uploadedContent || (mode === 'form' && formData)) && (
          <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (uploadedContent || applet.form_progress?.formCompleted) {
                    onClose();
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {uploadedContent || applet.form_progress?.formCompleted ? 'Done' : 'Save Progress'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
