'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Send, CheckCircle } from 'lucide-react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Select from '@radix-ui/react-select';

export default function MultiStepFormRenderer({ form }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Group fields by section
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
    if (!validateSection()) return;
    
    if (currentSection < sectionNames.length - 1) {
      setCurrentSection(currentSection + 1);
      setErrors({});
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
    
    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              <Select.Content className="overflow-hidden bg-aloa-white border-2 border-aloa-black shadow-xl">
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
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox.Root
                  id={`${field.name}-${option}`}
                  checked={formData[field.name]?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const current = formData[field.name] || [];
                    const updated = checked
                      ? [...current, option]
                      : current.filter(v => v !== option);
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
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-3">
          <span className="text-sm font-display uppercase tracking-wider text-aloa-gray">
            Step {currentSection + 1} of {sectionNames.length}
          </span>
          <span className="text-sm font-display uppercase tracking-wider text-aloa-gray">
            {Math.round(((currentSection + 1) / sectionNames.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-aloa-sand h-3 border-2 border-aloa-black">
          <motion.div
            className="bg-aloa-black h-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentSection + 1) / sectionNames.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Form Header */}
      <div className="mb-8">
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

          {currentSection === sectionNames.length - 1 ? (
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
              type="button"
              onClick={handleNext}
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