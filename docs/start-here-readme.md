import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus, Edit, Eye, Copy, Check, FileText, Settings, Send, Download, Trash2 } from 'lucide-react';

const FormBuilder = () => {
  const [view, setView] = useState('admin'); // 'admin', 'form', 'responses'
  const [forms, setForms] = useState({});
  const [activeFormId, setActiveFormId] = useState(null);
  const [formResponses, setFormResponses] = useState({});
  const [currentResponse, setCurrentResponse] = useState({});
  const [markdownInput, setMarkdownInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sample markdown template
  const sampleMarkdown = `# Website Redesign Stakeholder Survey
## Section: About You
- text* | name | Your Name
- text* | role | Your Role/Department  
- select | frequency | How often do you interact with our website?
  - Daily
  - Weekly
  - Monthly
  - Rarely

## Section: Website Inspiration
- text* | website1 | Favorite Website #1 URL
- textarea | website1_desc | What do you love about it?
- text | website2 | Favorite Website #2 URL
- textarea | website2_desc | What do you love about it?

## Section: Visual Preferences
- checkbox | colors | What colors appeal to you?
  - Bold and vibrant
  - Soft and muted tones
  - Dark/moody palette
  - Light and airy colors
  - Monochromatic
  - Earth tones
- text | specific_colors | Specific colors you want to see
- text | avoid_colors | Colors to avoid

## Section: Mood & Feeling
- text | feeling1 | First word to describe how visitors should feel
- text | feeling2 | Second word
- text | feeling3 | Third word
- radio | primary_emotion | Primary emotion to evoke
  - Trust and credibility
  - Excitement and energy
  - Calm and peace
  - Innovation
  - Warmth and community

## Section: Current Website
- textarea | likes | What do you LIKE about our current website?
- textarea | frustrations | What frustrates you most?
- text | one_change | If you could change ONE thing, what would it be?

## Section: Success Metrics
- textarea | success | How will we know the new website is successful?
- textarea | additional | Any additional thoughts or vision?`;

  // Parse markdown to form structure
  const parseMarkdown = (markdown) => {
    const lines = markdown.trim().split('\n');
    const formData = {
      title: '',
      sections: []
    };
    
    let currentSection = null;
    
    lines.forEach(line => {
      line = line.trim();
      
      if (line.startsWith('# ')) {
        formData.title = line.substring(2);
      } else if (line.startsWith('## Section: ')) {
        currentSection = {
          title: line.substring(12),
          fields: []
        };
        formData.sections.push(currentSection);
      } else if (line.startsWith('- ') && currentSection) {
        const fieldLine = line.substring(2);
        const parts = fieldLine.split(' | ');
        
        if (parts.length >= 3) {
          const typeInfo = parts[0].trim();
          const required = typeInfo.includes('*');
          const type = typeInfo.replace('*', '');
          
          const field = {
            type: type,
            name: parts[1].trim(),
            label: parts[2].trim(),
            required: required,
            options: []
          };
          
          currentSection.fields.push(field);
        }
      } else if (line.startsWith('  - ') && currentSection && currentSection.fields.length > 0) {
        const lastField = currentSection.fields[currentSection.fields.length - 1];
        if (lastField.type === 'select' || lastField.type === 'radio' || lastField.type === 'checkbox') {
          lastField.options.push(line.substring(4).trim());
        }
      }
    });
    
    return formData;
  };

  // Generate unique form ID
  const generateFormId = () => {
    return 'form_' + Math.random().toString(36).substr(2, 9);
  };

  // Create new form
  const createForm = () => {
    if (!markdownInput.trim()) {
      alert('Please enter markdown content for your form');
      return;
    }
    
    const formId = generateFormId();
    const formData = parseMarkdown(markdownInput);
    
    setForms(prev => ({
      ...prev,
      [formId]: {
        ...formData,
        id: formId,
        created: new Date().toISOString(),
        markdown: markdownInput
      }
    }));
    
    setFormResponses(prev => ({
      ...prev,
      [formId]: []
    }));
    
    setActiveFormId(formId);
    setView('form');
  };

  // Delete form
  const deleteForm = (formId) => {
    if (confirm('Are you sure you want to delete this form and all its responses?')) {
      setForms(prev => {
        const newForms = {...prev};
        delete newForms[formId];
        return newForms;
      });
      setFormResponses(prev => {
        const newResponses = {...prev};
        delete newResponses[formId];
        return newResponses;
      });
    }
  };

  // Copy form URL
  const copyFormUrl = (formId) => {
    const url = `${window.location.origin}/?form=${formId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Validate required fields
  const validateForm = () => {
    const form = forms[activeFormId];
    if (!form) return false;
    
    for (let section of form.sections) {
      for (let field of section.fields) {
        if (field.required) {
          const value = currentResponse[field.name];
          if (!value || (Array.isArray(value) && value.length === 0)) {
            alert(`Please fill in required field: ${field.label}`);
            return false;
          }
        }
      }
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    setFormResponses(prev => ({
      ...prev,
      [activeFormId]: [...(prev[activeFormId] || []), {
        ...currentResponse,
        submitted: new Date().toISOString()
      }]
    }));
    
    setCurrentResponse({});
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('admin');
    }, 2000);
  };

  // Download responses
  const downloadResponses = (formId) => {
    const responses = formResponses[formId] || [];
    const form = forms[formId];
    const exportData = {
      formTitle: form.title,
      formId: formId,
      totalResponses: responses.length,
      responses: responses
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.title.replace(/\s+/g, '-').toLowerCase()}-responses-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Admin View
  const AdminView = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Settings className="text-indigo-600" />
              Form Builder Admin
            </h1>
          </div>

          {/* Create New Form */}
          <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Create New Form</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Form Definition (Markdown Format)
                  </label>
                  <button
                    onClick={() => setMarkdownInput(sampleMarkdown)}
                    className="text-sm px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  >
                    Load Sample Template
                  </button>
                </div>
                <textarea
                  value={markdownInput}
                  onChange={(e) => setMarkdownInput(e.target.value)}
                  className="w-full h-64 p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none font-mono text-sm"
                  placeholder={`# Form Title
## Section: Section Name
- text* | field_name | Question Label
- textarea | field_name | Question Label
- select | field_name | Question Label
  - Option 1
  - Option 2
- checkbox | field_name | Question Label
  - Option 1
  - Option 2
- radio | field_name | Question Label
  - Option 1
  - Option 2

Note: * = required field`}
                />
              </div>
              <button
                onClick={createForm}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <Plus size={20} />
                Create Form
              </button>
            </div>
          </div>

          {/* Markdown Instructions */}
          <details className="mb-6">
            <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium">
              📖 Markdown Format Guide
            </summary>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm">
              <p className="font-semibold mb-2">Form Structure:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code className="bg-white px-1 rounded"># Title</code> - Sets the form title</li>
                <li><code className="bg-white px-1 rounded">## Section: Name</code> - Creates a new section</li>
                <li><code className="bg-white px-1 rounded">- type | field_id | Label</code> - Creates a field</li>
                <li>Add <code className="bg-white px-1 rounded">*</code> after type for required fields</li>
                <li>Indent options with <code className="bg-white px-1 rounded">  - Option</code> for select/radio/checkbox</li>
              </ul>
              <p className="font-semibold mt-3 mb-2">Supported Field Types:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code className="bg-white px-1 rounded">text</code> - Single line input</li>
                <li><code className="bg-white px-1 rounded">textarea</code> - Multi-line input</li>
                <li><code className="bg-white px-1 rounded">select</code> - Dropdown menu</li>
                <li><code className="bg-white px-1 rounded">radio</code> - Single choice</li>
                <li><code className="bg-white px-1 rounded">checkbox</code> - Multiple choices</li>
              </ul>
            </div>
          </details>

          {/* Existing Forms */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Forms</h2>
            {Object.keys(forms).length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No forms created yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first form above to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {Object.values(forms).map(form => (
                  <div key={form.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-all hover:shadow-md">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-800">{form.title}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          <span className="text-gray-500">
                            Created: {new Date(form.created).toLocaleDateString()}
                          </span>
                          <span className="text-gray-600 font-medium">
                            Responses: {(formResponses[form.id] || []).length}
                          </span>
                          <span className="text-indigo-600">
                            ID: {form.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActiveFormId(form.id);
                            setCurrentResponse({});
                            setView('form');
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Preview Form"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => copyFormUrl(form.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Copy Form URL"
                        >
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                        <button
                          onClick={() => {
                            setActiveFormId(form.id);
                            setView('responses');
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Responses"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setMarkdownInput(form.markdown);
                            window.scrollTo(0, 0);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit Form"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => deleteForm(form.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Form"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Form View
  const FormView = () => {
    const form = forms[activeFormId];
    if (!form) return <div className="p-8 text-center">Form not found</div>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 md:p-6">
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
            ✓ Response submitted successfully!
          </div>
        )}
        
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold">{form.title}</h1>
              <p className="mt-2 opacity-90">Please share your thoughts and preferences</p>
            </div>

            <div className="p-6 md:p-8">
              {form.sections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                    {section.title}
                  </h2>
                  <div className="space-y-4">
                    {section.fields.map((field, fieldIdx) => (
                      <div key={fieldIdx}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input
                            type="text"
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                            onChange={(e) => setCurrentResponse(prev => ({...prev, [field.name]: e.target.value}))}
                            value={currentResponse[field.name] || ''}
                            placeholder={field.required ? 'Required' : 'Optional'}
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <textarea
                            rows={3}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors resize-vertical"
                            onChange={(e) => setCurrentResponse(prev => ({...prev, [field.name]: e.target.value}))}
                            value={currentResponse[field.name] || ''}
                            placeholder={field.required ? 'Required' : 'Optional'}
                          />
                        )}
                        
                        {field.type === 'select' && (
                          <select
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                            onChange={(e) => setCurrentResponse(prev => ({...prev, [field.name]: e.target.value}))}
                            value={currentResponse[field.name] || ''}
                          >
                            <option value="">Select...</option>
                            {field.options.map((option, optIdx) => (
                              <option key={optIdx} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        
                        {field.type === 'radio' && (
                          <div className="space-y-2">
                            {field.options.map((option, optIdx) => (
                              <label key={optIdx} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                <input
                                  type="radio"
                                  name={field.name}
                                  value={option}
                                  className="mr-3 text-indigo-600"
                                  onChange={(e) => setCurrentResponse(prev => ({...prev, [field.name]: e.target.value}))}
                                  checked={currentResponse[field.name] === option}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {field.type === 'checkbox' && (
                          <div className="space-y-2">
                            {field.options.map((option, optIdx) => (
                              <label key={optIdx} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  className="mr-3 text-indigo-600"
                                  onChange={(e) => {
                                    const currentValues = currentResponse[field.name] || [];
                                    if (e.target.checked) {
                                      setCurrentResponse(prev => ({
                                        ...prev,
                                        [field.name]: [...currentValues, option]
                                      }));
                                    } else {
                                      setCurrentResponse(prev => ({
                                        ...prev,
                                        [field.name]: currentValues.filter(v => v !== option)
                                      }));
                                    }
                                  }}
                                  checked={(currentResponse[field.name] || []).includes(option)}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button
                  onClick={() => setView('admin')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Back to Admin
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Send size={20} />
                  Submit Response
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Responses View
  const ResponsesView = () => {
    const form = forms[activeFormId];
    const responses = formResponses[activeFormId] || [];
    
    if (!form) return <div className="p-8 text-center">Form not found</div>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">{form.title}</h1>
                <p className="text-gray-600">Total responses: {responses.length}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadResponses(activeFormId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  disabled={responses.length === 0}
                >
                  <Download size={18} />
                  Download
                </button>
                <button
                  onClick={() => setView('admin')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>

            {responses.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No responses yet</p>
                <p className="text-sm text-gray-400 mt-1">Share the form URL to start collecting responses</p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response, idx) => (
                  <div key={idx} className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors">
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <span className="font-semibold text-gray-700">Response #{idx + 1}</span>
                      <span className="ml-4 text-sm text-gray-500">
                        {new Date(response.submitted).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {Object.entries(response).map(([key, value]) => {
                        if (key === 'submitted') return null;
                        return (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <span className="font-medium text-gray-700">{key}:</span>
                            <span className="md:col-span-2 text-gray-600">
                              {Array.isArray(value) ? value.join(', ') : value || '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Initialize with sample form
  useEffect(() => {
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('form');
    if (formId && forms[formId]) {
      setActiveFormId(formId);
      setView('form');
    }
  }, [forms]);

  // Render appropriate view
  return (
    <div className="font-sans">
      {view === 'admin' && <AdminView />}
      {view === 'form' && <FormView />}
      {view === 'responses' && <ResponsesView />}
    </div>
  );
};

export default FormBuilder;
