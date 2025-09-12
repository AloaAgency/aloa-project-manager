'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Edit2, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import AuthGuard from '@/components/AuthGuard';

function EditFormPageContent() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    fetchFormData();
  }, [params.formId]);

  const fetchFormData = async () => {
    try {
      // ONLY use aloa_forms
      const response = await fetch(`/api/aloa-forms/${params.formId}`);
      
      if (!response.ok) throw new Error('Failed to fetch form');
      
      const data = await response.json();
      setForm(data);
      setFields(data.aloa_form_fields || []);
      setFormTitle(data.title || '');
      setFormDescription(data.description || '');
    } catch (error) {
      console.error('Error fetching form:', error);
      toast.error('Failed to load form');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId, property, value) => {
    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, [property]: value }
        : field
    ));
    setHasChanges(true);
  };

  const handleDeleteField = (fieldId) => {
    if (!confirm('Are you sure you want to delete this field? This cannot be undone.')) {
      return;
    }
    setFields(fields.filter(field => field.id !== fieldId));
    setHasChanges(true);
    toast.success('Field deleted');
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null) return;

    const draggedField = fields[draggedItem];
    const newFields = [...fields];
    
    // Remove dragged item
    newFields.splice(draggedItem, 1);
    
    // Insert at new position
    const adjustedIndex = draggedItem < dropIndex ? dropIndex - 1 : dropIndex;
    newFields.splice(adjustedIndex, 0, draggedField);
    
    // Update field_order for all fields
    const reorderedFields = newFields.map((field, index) => ({
      ...field,
      field_order: index
    }));
    
    setFields(reorderedFields);
    setDraggedItem(null);
    setHasChanges(true);
    toast.success('Field order updated');
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleTitleChange = (value) => {
    setFormTitle(value);
    setHasChanges(true);
  };

  const handleDescriptionChange = (value) => {
    setFormDescription(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // ONLY use aloa-forms API
      const response = await fetch(`/api/aloa-forms/${params.formId}/edit-fields`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields, title: formTitle, description: formDescription }),
      });

      if (!response.ok) throw new Error('Failed to update form');
      
      toast.success('Form updated successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Failed to update form');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner message="Loading form editor..." />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-aloa-black text-aloa-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-aloa-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-display font-bold">Edit Form</h1>
                <p className="text-sm text-aloa-white/70">Update form details and fields</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                hasChanges && !saving
                  ? 'bg-aloa-white text-aloa-black hover:bg-opacity-90'
                  : 'bg-aloa-white/20 text-aloa-white/50 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Warning Message */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Important: Be careful when deleting fields</p>
            <p>Deleting fields will permanently remove them from the form. Field types cannot be changed as it may break existing responses.</p>
            <p className="mt-1">You can drag and drop fields to reorder them.</p>
          </div>
        </div>
      </div>

      {/* Form Title and Description */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-aloa-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-6">
            {/* Title */}
            <div className="flex items-start gap-3">
              <Edit2 className="w-5 h-5 text-aloa-black mt-2" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Form Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors text-lg font-medium"
                  placeholder="Enter form title..."
                />
              </div>
            </div>
            
            {/* Description */}
            <div className="flex items-start gap-3">
              <Edit2 className="w-5 h-5 text-aloa-black mt-2" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Form Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors resize-none"
                  rows={3}
                  placeholder="Enter the description that appears below the form title..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-lg font-semibold text-aloa-black mb-4">Form Fields</h2>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div 
              key={field.id} 
              className={`bg-aloa-white rounded-lg shadow-md p-6 transition-all cursor-move ${
                draggedItem === index ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center gap-2">
                  <GripVertical className="w-5 h-5 text-aloa-gray hover:text-aloa-black cursor-grab" />
                  <div className="w-10 h-10 bg-aloa-black text-aloa-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  {/* Field Label */}
                  <div>
                    <label className="block text-sm font-medium text-aloa-gray mb-1">
                      Question / Label
                    </label>
                    <input
                      type="text"
                      value={field.field_label || ''}
                      onChange={(e) => handleFieldChange(field.id, 'field_label', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Field Type (Read-only) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Field Type
                      </label>
                      <div className="px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg text-gray-600">
                        {field.field_type}
                      </div>
                    </div>

                    {/* Field Name (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Field Name
                      </label>
                      <div className="px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg text-gray-600 font-mono text-sm">
                        {field.field_name}
                      </div>
                    </div>
                  </div>

                  {/* Placeholder (if applicable) */}
                  {['text', 'email', 'tel', 'url', 'number', 'textarea'].includes(field.field_type) && (
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Placeholder Text
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                        placeholder="Enter placeholder text..."
                      />
                    </div>
                  )}

                  {/* Options (if applicable) */}
                  {['select', 'radio', 'checkbox'].includes(field.field_type) && field.options && (
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Options
                      </label>
                      <textarea
                        value={field.options.join('\n')}
                        onChange={(e) => handleFieldChange(field.id, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                        className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                        rows={field.options.length + 1}
                        placeholder="One option per line..."
                      />
                    </div>
                  )}

                  {/* Additional Properties */}
                  <div className="flex items-center gap-6 text-sm">
                    {field.required !== undefined && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                          className="rounded border-aloa-sand text-aloa-black focus:ring-aloa-black"
                        />
                        <span className="text-aloa-gray">Required field</span>
                      </label>
                    )}
                    
                    {field.section && (
                      <div className="text-aloa-gray">
                        Section: <span className="font-medium text-aloa-black">{field.section}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete field"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditFormPage() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <EditFormPageContent />
    </AuthGuard>
  );
}