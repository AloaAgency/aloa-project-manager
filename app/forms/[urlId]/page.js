'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FormPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForm();
  }, [params.urlId]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/forms/${params.urlId}`);
      if (!response.ok) {
        throw new Error('Form not found');
      }
      const data = await response.json();
      setForm(data);
      
      const initialData = {};
      data.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.name] = [];
        } else {
          initialData[field.name] = '';
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error fetching form:', error);
      toast.error('Form not found');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (fieldName, option) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].includes(option)
        ? prev[fieldName].filter(o => o !== option)
        : [...prev[fieldName], option]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: form._id,
          data: formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setIsSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setIsCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-aloa-black rounded-full animate-pulse-slow" />
        </div>
      </div>
    );
  }

  if (!form) {
    return null;
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <Check className="w-16 h-16 mx-auto mb-6 text-green-600" />
          <h2 className="text-3xl font-display font-bold text-aloa-black mb-4 uppercase tracking-tight">
            Thank You!
          </h2>
          <p className="text-aloa-gray mb-8 font-body">
            Your response has been recorded successfully.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold text-aloa-black mb-4 uppercase tracking-tight">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-aloa-gray font-body">{form.description}</p>
            )}
            <button
              onClick={copyUrl}
              className="mt-4 flex items-center text-sm text-aloa-gray hover:text-aloa-black transition-colors font-body"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy form URL
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {form.fields.map((field) => (
              <div key={field._id}>
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    className="form-input min-h-[120px] resize-y"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    minLength={field.validation?.minLength}
                    maxLength={field.validation?.maxLength}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="form-input"
                    required={field.required}
                    value={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="space-y-3">
                    {field.options?.map((option) => (
                      <label key={option} className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name={field.name}
                          value={option}
                          required={field.required}
                          checked={formData[field.name] === option}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="w-5 h-5 text-aloa-black border-2 border-aloa-black focus:ring-aloa-black"
                        />
                        <span className="ml-3 font-body text-aloa-black group-hover:text-aloa-gray">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-3">
                    {field.options?.map((option) => (
                      <label key={option} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          value={option}
                          checked={formData[field.name]?.includes(option)}
                          onChange={() => handleCheckboxChange(field.name, option)}
                          className="w-5 h-5 text-aloa-black border-2 border-aloa-black focus:ring-aloa-black rounded-none"
                        />
                        <span className="ml-3 font-body text-aloa-black group-hover:text-aloa-gray">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    className="form-input"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    minLength={field.validation?.minLength}
                    maxLength={field.validation?.maxLength}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    pattern={field.validation?.pattern}
                  />
                )}
              </div>
            ))}

            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Submitting...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Submit Form
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}