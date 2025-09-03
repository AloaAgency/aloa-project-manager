import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Copy, ExternalLink, ArrowLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formAPI } from '../utils/api';

function CreateFormPage() {
  const navigate = useNavigate();
  const [markdownContent, setMarkdownContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdForm, setCreatedForm] = useState(null);
  const [copied, setCopied] = useState(false);

  const sampleMarkdown = `# Customer Satisfaction Survey
Help us improve our services!

## Section: About You
- text* | name | Your Full Name
- email* | email | Email Address
- text | company | Company Name
- select | role | Your Role
  - Manager
  - Developer
  - Designer
  - Marketing
  - Other

## Section: Product Experience
- radio* | usage_frequency | How often do you use our product?
  - Daily
  - Several times a week
  - Weekly
  - Monthly
  - Rarely

- select* | satisfaction | Overall Satisfaction
  - Very Satisfied
  - Satisfied
  - Neutral
  - Dissatisfied
  - Very Dissatisfied

- textarea* | likes | What do you like most about our product?
- textarea | improvements | What would you improve?

## Section: Features
- checkbox | features_used | Which features do you use? (Select all that apply)
  - Dashboard
  - Analytics
  - Reporting
  - Integrations
  - API Access
  - Mobile App

- radio* | recommend | Would you recommend us to others?
  - Definitely yes
  - Probably yes
  - Not sure
  - Probably not
  - Definitely not

## Section: Additional Feedback
- textarea | comments | Any other comments or suggestions?
- checkbox | contact | May we contact you for follow-up?
  - Yes, I'm interested in a follow-up`;

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMarkdownContent(e.target.result);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const handleSubmit = async () => {
    if (!markdownContent) {
      toast.error('Please provide markdown content');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (file) {
        response = await formAPI.uploadMarkdown(file);
      } else {
        response = await formAPI.createForm(markdownContent);
      }

      if (response.success) {
        setCreatedForm(response.form);
        toast.success('Form created successfully!');
      }
    } catch (error) {
      console.error('Error creating form:', error);
      toast.error(error.response?.data?.error || 'Failed to create form');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setFile(null);
    setMarkdownContent('');
    setCreatedForm(null);
  };

  if (createdForm) {
    const formUrl = `${window.location.origin}/form/${createdForm.urlId}`;
    
    return (
      <div className="min-h-screen bg-aloa-cream p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-aloa-white border border-aloa-black/10 p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-aloa-black mb-6">
                <Check className="h-8 w-8 text-aloa-cream" />
              </div>
              <h1 className="text-4xl font-bold text-aloa-black mb-3">Form Created!</h1>
              <p className="text-aloa-gray">Your form is ready to collect responses</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-aloa-black mb-3 uppercase tracking-wider">Form Title</label>
                <p className="text-2xl font-semibold text-aloa-black">{createdForm.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-aloa-black mb-3 uppercase tracking-wider">Form URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={formUrl}
                    className="flex-1 px-4 py-3 bg-aloa-cream border border-aloa-black/10 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(formUrl)}
                    className="p-3 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
                    title="Copy URL"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
                    title="Open Form"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-aloa-black/10">
                <button
                  onClick={resetForm}
                  className="btn-secondary text-center"
                >
                  Create Another
                </button>
                <Link
                  to="/dashboard"
                  className="btn-primary text-center"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aloa-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center text-aloa-black hover:text-aloa-gray mb-8 uppercase tracking-wider text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>

        <div className="bg-aloa-white border border-aloa-black/10 p-12">
          <h1 className="text-4xl font-bold text-aloa-black mb-3">Create a New Form</h1>
          <p className="text-aloa-gray mb-10">Upload a markdown file or paste markdown content to create your form</p>

          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={`border border-dashed p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-aloa-black bg-aloa-cream' : 'border-aloa-black/30 hover:border-aloa-black hover:bg-aloa-cream/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-aloa-black/50 mb-4" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-aloa-black" />
                <span className="text-aloa-black font-medium">{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setMarkdownContent('');
                  }}
                  className="ml-2 p-1 text-red-600 hover:bg-red-50"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <p className="text-aloa-black font-medium mb-2 uppercase tracking-wider text-sm">
                  {isDragActive ? 'Drop file here' : 'Drag & Drop Markdown File'}
                </p>
                <p className="text-sm text-aloa-gray">or click to select</p>
              </>
            )}
          </div>

          {/* Markdown Editor */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-aloa-black uppercase tracking-wider">
                Markdown Content
              </label>
              <button
                onClick={() => setMarkdownContent(sampleMarkdown)}
                className="text-sm px-4 py-2 text-aloa-black hover:bg-aloa-cream transition-colors border border-aloa-black/10"
              >
                Load Sample
              </button>
            </div>
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="w-full h-96 p-4 bg-aloa-cream border border-aloa-black/10 font-mono text-sm focus:border-aloa-black focus:outline-none transition-all"
              placeholder={`# Form Title
Description text

## Section: Section Name
- type* | field_name | Label
  - Option 1
  - Option 2`}
            />
          </div>

          {/* Format Guide */}
          <details className="mt-6 mb-8">
            <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium">
              View Format Guide
            </summary>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm">
              <h4 className="font-semibold mb-2">Field Types:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                <li><code className="bg-white px-1 rounded">text</code> - Single line text input</li>
                <li><code className="bg-white px-1 rounded">textarea</code> - Multi-line text input</li>
                <li><code className="bg-white px-1 rounded">email</code> - Email input with validation</li>
                <li><code className="bg-white px-1 rounded">number</code> - Numeric input</li>
                <li><code className="bg-white px-1 rounded">date</code> - Date picker</li>
                <li><code className="bg-white px-1 rounded">select</code> - Dropdown menu</li>
                <li><code className="bg-white px-1 rounded">radio</code> - Radio buttons (single choice)</li>
                <li><code className="bg-white px-1 rounded">checkbox</code> - Checkboxes (multiple choices)</li>
              </ul>
              <h4 className="font-semibold mb-2">Format:</h4>
              <code className="block bg-white p-2 rounded text-xs">
                - type* | field_name | Label | Placeholder (optional)
              </code>
              <p className="text-gray-600 mt-2">Add * after type to make field required</p>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-10 pt-10 border-t border-aloa-black/10">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !markdownContent}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateFormPage;