'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateFormPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('markdown', file);

    try {
      const response = await fetch('/api/forms/upload', {
        method: 'POST',
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push('/')}
          className="mb-8 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider"
        >
          ← Back
        </button>

        <div className="card">
          <h1 className="text-4xl font-display font-bold text-aloa-black mb-4 uppercase tracking-tight">
            Create New Form
          </h1>
          <p className="text-aloa-gray mb-8 font-body">
            Upload a markdown file to generate your form
          </p>

          <div
            {...getRootProps()}
            className={`
              border-4 border-dashed transition-all duration-300 cursor-pointer
              ${isDragActive 
                ? 'border-aloa-black bg-aloa-sand scale-105' 
                : 'border-aloa-gray hover:border-aloa-black hover:bg-aloa-white'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              p-12 text-center
            `}
          >
            <input {...getInputProps()} />
            
            {isUploading ? (
              <div className="animate-pulse">
                <div className="w-16 h-16 mx-auto mb-4 bg-aloa-black rounded-full animate-pulse-slow" />
                <p className="text-lg font-display text-aloa-black uppercase tracking-wider">
                  Processing...
                </p>
              </div>
            ) : uploadedFile ? (
              <div>
                <Check className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-display text-aloa-black mb-2 uppercase tracking-wider">
                  File Uploaded
                </p>
                <p className="text-sm text-aloa-gray font-body">{uploadedFile.name}</p>
              </div>
            ) : (
              <div>
                <Upload className="w-16 h-16 mx-auto mb-4 text-aloa-gray" />
                {isDragActive ? (
                  <p className="text-lg font-display text-aloa-black uppercase tracking-wider">
                    Drop the file here
                  </p>
                ) : (
                  <>
                    <p className="text-lg font-display text-aloa-black mb-2 uppercase tracking-wider">
                      Drag & drop your markdown file here
                    </p>
                    <p className="text-sm text-aloa-gray font-body">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 p-6 bg-aloa-sand">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-aloa-black mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-display font-bold text-aloa-black mb-2 uppercase tracking-wider">
                  Markdown Format
                </h3>
                <p className="text-sm text-aloa-gray mb-4 font-body">
                  Your markdown file should follow this structure:
                </p>
                <pre className="bg-aloa-black text-aloa-cream p-4 text-xs overflow-x-auto font-mono">
{`# Form Title
Form description goes here

## Field Label *
Type: text|email|number|textarea|select|radio|checkbox
Placeholder: Optional placeholder
Min: 10 (optional)
Max: 100 (optional)
  - Option 1 (for select/radio/checkbox)
  - Option 2`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}