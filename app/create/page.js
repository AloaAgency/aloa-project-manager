'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, AlertCircle, Bot, Wand2, Folder, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import AIChatFormBuilder from '@/components/AIChatFormBuilder';
import PasswordProtect from '@/components/PasswordProtect';

function CreateFormPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'upload'
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectKnowledge, setProjectKnowledge] = useState(null);
  const [projectletId, setProjectletId] = useState('');
  const [projectletName, setProjectletName] = useState('');

  useEffect(() => {
    fetchProjects();
    
    // Check if project is passed in URL
    const projectId = searchParams.get('project');
    const projectNameParam = searchParams.get('projectName');
    const projectletIdParam = searchParams.get('projectlet');
    const projectletNameParam = searchParams.get('projectletName');
    
    if (projectId) {
      setSelectedProject(projectId);
      if (projectNameParam) {
        setProjectName(projectNameParam);
      }
      fetchProjectKnowledge(projectId);
    }
    
    if (projectletIdParam) {
      setProjectletId(projectletIdParam);
      if (projectletNameParam) {
        setProjectletName(projectletNameParam);
      }
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/aloa-projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectKnowledge = async (projectId) => {
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/knowledge`);
      const data = await response.json();
      setProjectKnowledge(data);
    } catch (error) {
      console.error('Error fetching project knowledge:', error);
    }
  };

  const handleMarkdownGenerated = async (markdown) => {
    setIsUploading(true);
    
    try {
      // Create a Blob from the markdown string
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const file = new File([blob], 'ai-generated-form.md', { type: 'text/markdown' });
      
      const formData = new FormData();
      formData.append('markdown', file);
      if (selectedProject) {
        formData.append('projectId', selectedProject);
      }

      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/aloa-forms/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken || '',
          'X-AI-Generated': 'true', // Mark as AI-generated
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create form');
      }

      // If this form is being created for a projectlet, attach it
      if (projectletId && data.id) {
        try {
          const attachResponse = await fetch(`/api/aloa-projects/${selectedProject}/projectlets/${projectletId}/applets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken || '',
            },
            body: JSON.stringify({
              name: data.title || 'Form',
              description: `Form created with AI: ${data.title}`,
              type: 'form',
              form_id: data.id,
              config: {
                formTitle: data.title,
                formId: data.id
              }
            })
          });

          if (attachResponse.ok) {
            toast.success('Form created and attached to projectlet!');
            // Close the window if it was opened as a popup
            if (window.opener) {
              window.close();
            } else {
              router.push(`/admin/project/${selectedProject}`);
            }
            return;
          }
        } catch (attachError) {
          console.error('Error attaching form to projectlet:', attachError);
          // Continue with normal flow even if attachment fails
        }
      }

      toast.success('Form created successfully!');
      router.push(`/forms/${data.urlId}`);
    } catch (error) {
      console.error('Form creation error:', error);
      toast.error(error.message || 'Failed to create form');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('markdown', file);
    if (selectedProject) {
      formData.append('projectId', selectedProject);
    }

    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/aloa-forms/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken || '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload form');
      }

      toast.success('Form created successfully!');
      router.push(`/forms/${data.urlId}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to create form');
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          onClick={() => router.push('/')}
          className="mb-6 sm:mb-8 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-sm"
        >
          ← Back to Home
        </button>

        <div className="card">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-aloa-black mb-4 uppercase tracking-tight">
            Create New Form
          </h1>
          <p className="text-aloa-gray mb-6 font-body">
            {projectletName ? 
              `Creating form for "${projectletName}" - Chat with AI or upload a markdown file` :
              'Chat with AI or upload a markdown file to generate your form'}
          </p>

          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <label className="block text-sm font-medium text-aloa-gray mb-2">
                {projectletId ? 'Project' : 'Select Project (Optional)'}
              </label>
              <div className="relative">
                <select
                  value={selectedProject}
                  disabled={!!projectletId}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    if (e.target.value) {
                      fetchProjectKnowledge(e.target.value);
                    } else {
                      setProjectKnowledge(null);
                    }
                  }}
                  className={`w-full md:w-1/2 px-4 py-2 pr-10 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors appearance-none bg-white ${
                    projectletId ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">No Project (Uncategorized)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Folder className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-aloa-gray pointer-events-none" />
              </div>
              <p className="mt-2 text-sm text-aloa-gray">
                {projectletId ? 
                  'This form will be attached to the selected projectlet' :
                  'Organize your form into a project for better management'}
              </p>
              
              {projectKnowledge && projectKnowledge.stats && projectKnowledge.stats.totalDocuments > 0 && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start">
                    <Brain className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">
                        AI Knowledge Available
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        This project has {projectKnowledge.stats.totalDocuments} knowledge documents 
                        and {projectKnowledge.stats.totalInsights} insights that will be used to 
                        generate better, more contextual forms.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Bot className="h-5 w-5" />
                <span>AI Chat Builder</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="h-5 w-5" />
                <span>Upload Markdown</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'chat' ? (
            <div>
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-full animate-pulse" />
                    <p className="text-lg font-display text-purple-600 uppercase tracking-wider animate-pulse">
                      Creating your form...
                    </p>
                  </div>
                </div>
              )}
              <AIChatFormBuilder 
                onMarkdownGenerated={handleMarkdownGenerated}
                projectContext={projectKnowledge?.project?.ai_context}
                projectName={projectName}
              />
            </div>
          ) : (
            <div>
              <div
                {...getRootProps()}
                className={`
                  border-4 border-dashed transition-all duration-300 cursor-pointer rounded-xl
                  ${isDragActive 
                    ? 'border-purple-600 bg-purple-50 scale-105' 
                    : 'border-gray-300 hover:border-purple-600 hover:bg-gray-50'
                  }
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                  p-8 sm:p-12 text-center
                `}
              >
                <input {...getInputProps()} />
                
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-full animate-pulse" />
                    <p className="text-lg font-display text-purple-600 uppercase tracking-wider animate-pulse">
                      Processing your form...
                    </p>
                  </div>
                ) : uploadedFile ? (
                  <div>
                    <Check className="w-16 h-16 mx-auto mb-4 text-green-600" />
                    <p className="text-lg font-display text-gray-900 mb-2">
                      File Uploaded
                    </p>
                    <p className="text-sm text-gray-600">{uploadedFile.name}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    {isDragActive ? (
                      <p className="text-lg font-display text-purple-600">
                        Drop the file here
                      </p>
                    ) : (
                      <>
                        <p className="text-lg font-display text-gray-900 mb-2">
                          Drag & drop your markdown file here
                        </p>
                        <p className="text-sm text-gray-600">
                          or click to browse
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Markdown Format Example
                    </h3>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`# Contact Form

## Personal Information
What is your name? (text) *
What is your email? (email) *
What is your phone? (phone)

## Message
Your message (textarea) *

## Preferences
How did you hear about us? (select: Google, Social Media, Friend, Other) *
Subscribe to newsletter? (checkbox: Yes, subscribe me)`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateFormPage() {
  return (
    <PasswordProtect>
      <CreateFormPageContent />
    </PasswordProtect>
  );
}