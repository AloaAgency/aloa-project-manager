'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Send, CheckCircle, Star } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Select from '@radix-ui/react-select';

export default function MultiStepFormRenderer({ 
  form, 
  isModal = false, 
  onComplete,
  initialData,
  initialSection,
  onProgressChange,
  isViewOnly = false 
}) {
  // Generate a unique storage key for this form (don't use localStorage in modal mode)
  const storageKey = `formProgress_${form._id || form.urlId}`;
  
  // Initialize state from localStorage or props if available
  const [currentSection, setCurrentSection] = useState(() => {
    if (isModal && initialSection !== undefined) {
      return initialSection;
    }
    if (!isModal && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}_section`);
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  
  const [formData, setFormData] = useState(() => {
    if (isModal && initialData) {
      return initialData;
    }
    if (!isModal && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${storageKey}_data`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasRestoredData, setHasRestoredData] = useState(false);
  
  // Check if we restored saved data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem(`${storageKey}_data`);
      if (savedData && Object.keys(JSON.parse(savedData)).length > 0) {
        setHasRestoredData(true);
        // Hide the message after 5 seconds
        setTimeout(() => setHasRestoredData(false), 5000);
      }
    }
  }, [storageKey]);
  
  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    if (!isModal && typeof window !== 'undefined' && !submitted) {
      localStorage.setItem(`${storageKey}_data`, JSON.stringify(formData));
    }
  }, [formData, storageKey, submitted, isModal]);
  
  // Auto-save current section to localStorage
  useEffect(() => {
    if (!isModal && typeof window !== 'undefined' && !submitted) {
      localStorage.setItem(`${storageKey}_section`, currentSection.toString());
    }
  }, [currentSection, storageKey, submitted, isModal]);
  
  // Call progress change callback for modal mode
  useEffect(() => {
    if (isModal && onProgressChange && !submitted) {
      onProgressChange(formData, currentSection);
    }
  }, [formData, currentSection, isModal, onProgressChange, submitted]);
  
  // Clear saved data after successful submission
  useEffect(() => {
    if (submitted && typeof window !== 'undefined') {
      localStorage.removeItem(`${storageKey}_data`);
      localStorage.removeItem(`${storageKey}_section`);
    }
  }, [submitted, storageKey]);

  // Group fields by section
  // Ensure form.fields exists and is an array
  if (!form || !form.fields || !Array.isArray(form.fields)) {
    console.error('Form fields are missing or invalid:', form);
    return <div>Error: Form fields not properly loaded</div>;
  }
  
  const sections = form.fields.reduce((acc, field) => {
    const sectionName = field.section || 'General Information';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(field);
    return acc;
  }, {});

  // Filter out empty sections
  const sectionNames = Object.keys(sections).filter(name => sections[name].length > 0);
  const currentFields = sections[sectionNames[currentSection]] || [];

  const validateSection = () => {
    const newErrors = {};
    let isValid = true;

    currentFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'This field is required';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = (e) => {
    e?.preventDefault();
    console.log('handleNext called - currentSection:', currentSection, 'sectionNames:', sectionNames);
    
    if (!validateSection()) {
      console.log('Validation failed');
      return;
    }
    
    if (currentSection < sectionNames.length - 1) {
      console.log('Moving to next section:', currentSection + 1);
      setCurrentSection(currentSection + 1);
      setErrors({});
    } else {
      console.log('Already at last section');
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateSection()) return;

    setIsSubmitting(true);
    console.log('Submitting form data:', formData);
    console.log('Form ID:', form._id);
    
    // If in modal mode with onComplete callback, use that instead
    if (isModal && onComplete) {
      try {
        await onComplete(formData);
        setSubmitted(true);
      } catch (error) {
        console.error('Submit error:', error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    // Otherwise, use the normal submission flow
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];
      
      const response = await fetch('/api/aloa-responses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          formId: form._id,
          data: formData
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Response saved successfully:', result);
        setSubmitted(true);
      } else {
        const error = await response.text();
        console.error('Failed to save response:', error);
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field) => {
    // If in view-only mode, render as read-only display
    if (isViewOnly) {
      const value = formData[field.name];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return <div className="text-gray-500 italic">No response provided</div>;
      }
      
      // Format the value based on field type
      let displayValue = value;
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (field.type === 'rating') {
        const maxRating = field.validation?.max || 5;
        return (
          <div className="flex gap-1">
            {[...Array(maxRating)].map((_, index) => (
              <Star
                key={index}
                className={`h-5 w-5 ${
                  index < parseInt(value) 
                    ? 'fill-yellow-500 text-yellow-500' 
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-gray-600">({value}/{maxRating})</span>
          </div>
        );
      }
      
      return (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-800">{displayValue}</p>
        </div>
      );
    }
    
    const commonProps = {
      id: field.name,
      name: field.name,
      placeholder: field.placeholder,
      required: field.required,
      onChange: (e) => setFormData({ ...formData, [field.name]: e.target.value }),
      value: formData[field.name] || '',
      className: errors[field.name] ? 'border-red-500' : ''
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      case 'date':
        return <Input type={field.type} {...commonProps} />;
      
      case 'textarea':
        return <Textarea {...commonProps} />;
      
      case 'select':
        return (
          <Select.Root value={formData[field.name] || ''} onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}>
            <Select.Trigger className="flex h-12 w-full items-center justify-between bg-aloa-white border-2 border-aloa-black px-4 py-3 text-base hover:shadow-md focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream transition-all duration-200">
              <Select.Value placeholder={field.placeholder || 'Select an option'} />
              <Select.Icon className="ml-2">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content 
                className="overflow-hidden bg-aloa-white border-2 border-aloa-black shadow-xl" 
                style={{ zIndex: 10000 }}
                position="popper"
                sideOffset={5}
              >
                <Select.Viewport className="p-1">
                  {field.options?.map((option) => (
                    <Select.Item
                      key={option}
                      value={option}
                      className="relative flex cursor-pointer select-none items-center px-8 py-2 text-base hover:bg-aloa-sand focus:bg-aloa-sand focus:outline-none transition-colors duration-200"
                    >
                      <Select.ItemText>{option}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        );
      
      case 'radio':
        return (
          <RadioGroup.Root
            value={formData[field.name] || ''}
            onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
            className="space-y-2"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroup.Item
                  value={option}
                  id={`${field.name}-${option}`}
                  className="h-5 w-5 rounded-full border-2 border-aloa-black hover:shadow-md focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream transition-all duration-200"
                >
                  <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2.5 after:w-2.5 after:rounded-full after:bg-aloa-black" />
                </RadioGroup.Item>
                <label
                  htmlFor={`${field.name}-${option}`}
                  className="text-sm font-medium text-aloa-black cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </RadioGroup.Root>
        );
      
      case 'checkbox':
      case 'multiselect':
        // If no options, show a message
        if (!field.options || field.options.length === 0) {
          return (
            <div className="text-gray-500 italic">
              No options available for {field.label || field.name}
            </div>
          );
        }
        
        return (
          <div className="space-y-2">
            {field.options.map((option) => {
              // Ensure formData[field.name] is an array
              const currentValues = Array.isArray(formData[field.name]) ? formData[field.name] : [];
              const isChecked = currentValues.includes(option);
              
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox.Root
                    id={`${field.name}-${option}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);
                      setFormData({ ...formData, [field.name]: updated });
                    }}
                    className="h-5 w-5 border-2 border-aloa-black bg-aloa-white data-[state=checked]:bg-aloa-black hover:shadow-md focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream transition-all duration-200"
                  >
                    <Checkbox.Indicator className="flex items-center justify-center text-aloa-cream">
                      <CheckCircle className="h-4 w-4" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <label
                    htmlFor={`${field.name}-${option}`}
                    className="text-sm font-medium text-aloa-black cursor-pointer select-none"
                    onClick={(e) => {
                      e.preventDefault();
                      const checkbox = document.getElementById(`${field.name}-${option}`);
                      if (checkbox) {
                        const event = new MouseEvent('click', { bubbles: true });
                        checkbox.dispatchEvent(event);
                      }
                    }}
                  >
                    {option}
                  </label>
                </div>
              );
            })}
          </div>
        );
      
      case 'rating':
        const maxRating = field.validation?.max || 5;
        const currentRating = parseInt(formData[field.name]) || 0;
        return (
          <div className="flex gap-2">
            {[...Array(maxRating)].map((_, index) => (
              <button
                key={index + 1}
                type="button"
                onClick={() => setFormData({ ...formData, [field.name]: String(index + 1) })}
                className="p-1 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream"
                aria-label={`Rate ${index + 1} out of ${maxRating}`}
              >
                <Star
                  className={`h-8 w-8 ${
                    index < currentRating 
                      ? 'fill-aloa-black text-aloa-black' 
                      : 'text-aloa-gray hover:text-aloa-black'
                  }`}
                />
              </button>
            ))}
          </div>
        );
      
      case 'multiselect':
        const selectedValues = formData[field.name] || [];
        return (
          <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-aloa-black p-3">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox.Root
                  id={`${field.name}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    setFormData({ ...formData, [field.name]: updated });
                  }}
                  className="h-5 w-5 border-2 border-aloa-black hover:shadow-md focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream transition-all duration-200"
                >
                  <Checkbox.Indicator className="flex items-center justify-center text-aloa-black">
                    <CheckCircle className="h-4 w-4" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label
                  htmlFor={`${field.name}-${option}`}
                  className="text-sm font-medium text-aloa-black cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'phone':
        return <Input type="tel" {...commonProps} />;
      
      default:
        return <Input type="text" {...commonProps} />;
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-8"
      >
        <div className="bg-aloa-black text-aloa-cream p-4 rounded-full mb-6">
          <CheckCircle className="h-16 w-16" />
        </div>
        <h2 className="text-3xl font-display font-bold text-aloa-black mb-3 uppercase tracking-wider">Thank You!</h2>
        <p className="text-lg text-aloa-gray font-body">Your response has been successfully submitted.</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Restored data notification */}
      {hasRestoredData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 p-4 bg-aloa-sand border-2 border-aloa-black"
        >
          <p className="text-aloa-black font-body">
            ✨ Your previous progress has been restored. You can continue where you left off.
          </p>
        </motion.div>
      )}
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-3">
          <span className="text-sm font-display uppercase tracking-wider text-aloa-gray">
            Step {currentSection + 1} of {sectionNames.length}
          </span>
          <span className="text-sm font-display uppercase tracking-wider text-aloa-gray">
            {sectionNames.length > 0 ? Math.round(((currentSection + 1) / sectionNames.length) * 100) : 0}% Complete
          </span>
        </div>
        <div className="w-full bg-aloa-sand h-3 border-2 border-aloa-black">
          <motion.div
            className="bg-aloa-black h-full"
            initial={{ width: 0 }}
            animate={{ width: sectionNames.length > 0 ? `${((currentSection + 1) / sectionNames.length) * 100}%` : '0%' }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Form Header */}
      <div className="mb-8">
        {isViewOnly && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-medium text-blue-800">Viewing your submitted response (read-only)</span>
          </div>
        )}
        <h1 className="text-3xl font-display font-bold text-aloa-black mb-2 uppercase tracking-tight">{form.title}</h1>
        {form.description && (
          <p className="text-aloa-gray font-body">{form.description}</p>
        )}
      </div>

      {/* Section Title */}
      <motion.div
        key={currentSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-xl font-display font-bold text-aloa-black mb-2 uppercase tracking-wider">
          {sectionNames[currentSection]}
        </h2>
        <div className="h-1 w-24 bg-aloa-black"></div>
      </motion.div>

      {/* Form Fields */}
      <form onSubmit={(e) => {
        e.preventDefault();
        if (currentSection === sectionNames.length - 1) {
          handleSubmit(e);
        } else {
          handleNext(e);
        }
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {currentFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderField(field)}
                {errors[field.name] && (
                  <p className="text-sm text-red-600 mt-1 font-body">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSection === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {isViewOnly ? (
            currentSection < sectionNames.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-sm font-medium">View Only Mode</span>
              </div>
            )
          ) : currentSection === sectionNames.length - 1 ? (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}