import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formAPI, responseAPI } from '../utils/api';

function FormPage() {
  const { urlId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentSection, setCurrentSection] = useState(0);
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();

  useEffect(() => {
    loadForm();
  }, [urlId]);

  const loadForm = async () => {
    try {
      const data = await formAPI.getPublicForm(urlId);
      setForm(data);
    } catch (error) {
      console.error('Error loading form:', error);
      toast.error('Form not found or has expired');
      setTimeout(() => navigate('/'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const response = await responseAPI.submitResponse(urlId, {
        answers: data,
        email: data.email,
        startTime
      });
      
      setSubmitted(true);
      toast.success(response.message || 'Thank you for your submission!');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.response?.data?.error || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const fieldError = errors[field.name];
    const commonClasses = "w-full px-4 py-3 bg-aloa-white border transition-all focus:outline-none";
    const errorClasses = fieldError ? "border-red-500" : "border-aloa-black/10 focus:border-aloa-black";

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.type}
            {...register(field.name, { 
              required: field.required ? `${field.label} is required` : false,
              pattern: field.type === 'email' ? {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              } : undefined
            })}
            placeholder={field.placeholder || (field.required ? 'Required' : 'Optional')}
            className={`${commonClasses} ${errorClasses}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            {...register(field.name, { 
              required: field.required ? `${field.label} is required` : false 
            })}
            className={`${commonClasses} ${errorClasses}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...register(field.name, { 
              required: field.required ? `${field.label} is required` : false 
            })}
            placeholder={field.placeholder || (field.required ? 'Required' : 'Optional')}
            rows={4}
            className={`${commonClasses} ${errorClasses} resize-vertical`}
          />
        );

      case 'select':
        return (
          <select
            {...register(field.name, { 
              required: field.required ? `${field.label} is required` : false 
            })}
            className={`${commonClasses} ${errorClasses}`}
          >
            <option value="">Select an option...</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center p-4 bg-aloa-cream hover:bg-aloa-sand cursor-pointer transition-colors border border-aloa-black/5">
                <input
                  type="radio"
                  value={option}
                  {...register(field.name, { 
                    required: field.required ? `${field.label} is required` : false 
                  })}
                  className="mr-3 text-aloa-black focus:ring-aloa-black"
                />
                <span className="text-aloa-black">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center p-4 bg-aloa-cream hover:bg-aloa-sand cursor-pointer transition-colors border border-aloa-black/5">
                <input
                  type="checkbox"
                  value={option}
                  {...register(`${field.name}.${idx}`)}
                  className="mr-3 text-aloa-black focus:ring-aloa-black"
                />
                <span className="text-aloa-black">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-aloa-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-aloa-black animate-spin mx-auto mb-4" />
          <p className="text-aloa-gray">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-aloa-cream flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-aloa-black mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-aloa-black mb-2">Form Not Found</h2>
          <p className="text-aloa-gray">This form may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-aloa-cream flex items-center justify-center p-4">
        <div className="bg-aloa-white p-12 max-w-md w-full text-center animate-slide-up border border-aloa-black/10">
          <CheckCircle className="h-16 w-16 text-aloa-black mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-aloa-black mb-3">Thank You!</h2>
          <p className="text-aloa-gray mb-8 leading-relaxed">
            {form.settings?.successMessage || 'Your response has been successfully submitted.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const totalSections = form.sections?.length || 0;
  const progressPercentage = ((currentSection + 1) / totalSections) * 100;

  return (
    <div className="min-h-screen bg-aloa-cream py-12">
      <div className="max-w-3xl mx-auto px-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-aloa-white border border-aloa-black/10 overflow-hidden">
            {/* Header */}
            <div className="bg-aloa-black text-aloa-cream p-8 md:p-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{form.title}</h1>
              {form.description && (
                <p className="text-aloa-cream/80 leading-relaxed">{form.description}</p>
              )}
            </div>

            {/* Progress Bar */}
            {form.settings?.showProgressBar && totalSections > 1 && (
              <div className="px-6 pt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Section {currentSection + 1} of {totalSections}</span>
                  <span>{Math.round(progressPercentage)}% Complete</span>
                </div>
                <div className="w-full bg-aloa-black/10 h-1">
                  <div
                    className="bg-aloa-black h-1 transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Form Content */}
            <div className="p-8 md:p-12">
              {form.sections?.map((section, sectionIdx) => (
                <div
                  key={sectionIdx}
                  className={sectionIdx === currentSection ? 'block animate-fade-in' : 'hidden'}
                >
                  <h2 className="text-2xl font-semibold text-aloa-black mb-3 uppercase tracking-wide">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="text-aloa-gray mb-8 leading-relaxed">{section.description}</p>
                  )}
                  
                  <div className="space-y-6">
                    {section.fields?.map((field, fieldIdx) => (
                      <div key={fieldIdx}>
                        <label className="block text-sm font-medium text-aloa-black mb-3 uppercase tracking-wider">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderField(field)}
                        {errors[field.name] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors[field.name].message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-12 pt-8 border-t border-aloa-black/10">
                {currentSection > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentSection(currentSection - 1)}
                    className="btn-secondary"
                  >
                    Previous
                  </button>
                )}
                
                {currentSection < totalSections - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentSection(currentSection + 1)}
                    className="ml-auto btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ml-auto btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Submit
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormPage;