'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, AlertCircle, Bot, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AIChatFormBuilder from '@/components/AIChatFormBuilder';

export default function CreateFormPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'upload'

  const handleMarkdownGenerated = async (markdown) => {
    setIsUploading(true);
    
    try {
      // Create a Blob from the markdown string
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const file = new File([blob], 'ai-generated-form.md', { type: 'text/markdown' });
      
      const formData = new FormData();
      formData.append('markdown', file);

      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/forms/upload', {
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

    try {
      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/forms/upload', {
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
          <p className="text-aloa-gray mb-6 sm:mb-8 font-body">
            Chat with AI or upload a markdown file to generate your form
          </p>

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
              <AIChatFormBuilder onMarkdownGenerated={handleMarkdownGenerated} />
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