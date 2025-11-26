'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Edit2, Trash2, GripVertical, Globe, Lock, Copy, Check, Plus, X } from 'lucide-react';
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
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState({
    field_label: '',
    field_name: '',
    field_type: 'text',
    required: false,
    placeholder: '',
    options: [],
    section: ''
  });

  // Available field types
  const FIELD_TYPES = [
    { value: 'text', label: 'Text', description: 'Single line text input' },
    { value: 'textarea', label: 'Long Text', description: 'Multi-line text area' },
    { value: 'email', label: 'Email', description: 'Email address input' },
    { value: 'tel', label: 'Phone', description: 'Phone number input' },
    { value: 'url', label: 'URL', description: 'Website URL input' },
    { value: 'number', label: 'Number', description: 'Numeric input' },
    { value: 'date', label: 'Date', description: 'Date picker' },
    { value: 'time', label: 'Time', description: 'Time picker' },
    { value: 'select', label: 'Dropdown', description: 'Single selection from options' },
    { value: 'radio', label: 'Radio Buttons', description: 'Single selection with visible options' },
    { value: 'checkbox', label: 'Checkboxes', description: 'Multiple selection from options' },
    { value: 'file', label: 'File Upload', description: 'File attachment' },
    { value: 'rating', label: 'Rating', description: 'Star rating input' },
  ];

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
      setIsPublic(data.is_public || false);
    } catch (error) {

      toast.error('Failed to load form');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldIndex, property, value) => {
    setFields(fields.map((field, idx) =>
      idx === fieldIndex
        ? { ...field, [property]: value }
        : field
    ));
    setHasChanges(true);
  };

  const handleDeleteField = (fieldIndex) => {
    if (!confirm('Are you sure you want to delete this field? This cannot be undone.')) {
      return;
    }
    setFields(fields.filter((_, idx) => idx !== fieldIndex));
    setHasChanges(true);
    toast.success('Field deleted');
  };

  // Generate field_name from label
  const generateFieldName = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  };

  // Reset new field form
  const resetNewField = () => {
    setNewField({
      field_label: '',
      field_name: '',
      field_type: 'text',
      required: false,
      placeholder: '',
      options: [],
      section: ''
    });
  };

  // Add new field
  const handleAddField = () => {
    if (!newField.field_label.trim()) {
      toast.error('Please enter a question/label for the field');
      return;
    }

    // Generate field name if not provided
    const fieldName = newField.field_name.trim() || generateFieldName(newField.field_label);

    // Check if field name already exists
    const nameExists = fields.some(f => f.field_name === fieldName);
    if (nameExists) {
      toast.error('A field with this name already exists. Please choose a different name.');
      return;
    }

    // For select/radio/checkbox, ensure options are provided
    if (['select', 'radio', 'checkbox'].includes(newField.field_type) && newField.options.length === 0) {
      toast.error('Please add at least one option for this field type');
      return;
    }

    // Create new field object (without id - API will handle insert)
    const newFieldObj = {
      field_label: newField.field_label.trim(),
      field_name: fieldName,
      field_type: newField.field_type,
      required: newField.required,
      placeholder: newField.placeholder.trim() || null,
      options: newField.options.length > 0 ? newField.options : null,
      field_order: fields.length, // Add at the end
      validation: newField.section ? { section: newField.section } : null,
      section: newField.section || null,
      // No id - this tells the API it's a new field
    };

    setFields([...fields, newFieldObj]);
    setHasChanges(true);
    setShowAddFieldModal(false);
    resetNewField();
    toast.success('Field added! Remember to save your changes.');
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

  const handleVisibilityChange = (value) => {
    setIsPublic(value);
    setHasChanges(true);
  };

  const copyFormLink = () => {
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/forms/${form?.url_id}`;
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast.success('Form link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
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
        body: JSON.stringify({ fields, title: formTitle, description: formDescription, is_public: isPublic }),
      });

      if (!response.ok) throw new Error('Failed to update form');

      toast.success('Form updated successfully!');
      setHasChanges(false);
    } catch (error) {

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
            <p className="font-semibold mb-1">Important: Changes may affect existing responses</p>
            <p>Deleting fields or changing field types may affect how existing responses are displayed. Removed options from dropdowns/checkboxes may cause data inconsistencies.</p>
            <p className="mt-1">You can drag and drop fields to reorder them, and click "Add Field" to add new questions.</p>
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

            {/* Visibility Settings */}
            <div className="border-t border-aloa-sand pt-6">
              <div className="flex items-start gap-3">
                {isPublic ? (
                  <Globe className="w-5 h-5 text-green-600 mt-1" />
                ) : (
                  <Lock className="w-5 h-5 text-aloa-gray mt-1" />
                )}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-aloa-gray mb-2">
                    Form Visibility
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleVisibilityChange(false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        !isPublic
                          ? 'border-aloa-black bg-aloa-black text-white'
                          : 'border-aloa-sand text-aloa-gray hover:border-aloa-gray'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      Private
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVisibilityChange(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        isPublic
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-aloa-sand text-aloa-gray hover:border-aloa-gray'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Public
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-aloa-gray">
                    {isPublic ? (
                      <span className="text-green-700">
                        Anyone with the link can view and submit this form without logging in.
                      </span>
                    ) : (
                      <span>
                        Only authenticated users with project access can view this form.
                      </span>
                    )}
                  </p>

                  {/* Share Link Section */}
                  {isPublic && form?.url_id && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Shareable Link
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/forms/${form.url_id}`}
                          className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-gray-700"
                        />
                        <button
                          type="button"
                          onClick={copyFormLink}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-green-700">
                        Share this link with anyone to let them fill out the form.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-aloa-black">Form Fields</h2>
          <button
            onClick={() => setShowAddFieldModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-aloa-black text-aloa-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id || `new-field-${index}`}
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
                      onChange={(e) => handleFieldChange(index, 'field_label', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Field Type and Field Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Field Type
                      </label>
                      <select
                        value={field.field_type || 'text'}
                        onChange={(e) => {
                          const newType = e.target.value;
                          // Clear options if switching away from select/radio/checkbox
                          if (!['select', 'radio', 'checkbox'].includes(newType)) {
                            handleFieldChange(index, 'options', null);
                          }
                          // Initialize empty options if switching to select/radio/checkbox
                          if (['select', 'radio', 'checkbox'].includes(newType) && !field.options) {
                            handleFieldChange(index, 'options', []);
                          }
                          handleFieldChange(index, 'field_type', newType);
                        }}
                        className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors bg-white"
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Field Name (Editable) */}
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={field.field_name || ''}
                        onChange={(e) => handleFieldChange(index, 'field_name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors font-mono text-sm"
                        placeholder="field_name"
                      />
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
                        onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                        placeholder="Enter placeholder text..."
                      />
                    </div>
                  )}

                  {/* Options (if applicable) */}
                  {['select', 'radio', 'checkbox'].includes(field.field_type) && (
                    <div>
                      <label className="block text-sm font-medium text-aloa-gray mb-1">
                        Options <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={(field.options || []).join('\n')}
                        onChange={(e) => handleFieldChange(index, 'options', e.target.value.split('\n').filter(o => o.trim()))}
                        className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                        rows={Math.max((field.options || []).length + 1, 3)}
                        placeholder="Enter one option per line..."
                      />
                      <p className="text-xs text-aloa-gray mt-1">Enter each option on a new line</p>
                    </div>
                  )}

                  {/* Section */}
                  <div>
                    <label className="block text-sm font-medium text-aloa-gray mb-1">
                      Section <span className="text-aloa-gray/60">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={field.section || field.validation?.section || ''}
                      onChange={(e) => {
                        handleFieldChange(index, 'section', e.target.value || null);
                        handleFieldChange(index, 'validation', e.target.value ? { section: e.target.value } : null);
                      }}
                      className="w-full px-4 py-2 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                      placeholder="e.g., Contact Information"
                    />
                    <p className="text-xs text-aloa-gray mt-1">Group fields under a section heading in multi-step forms</p>
                  </div>

                  {/* Required Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-aloa-sand/20 rounded-lg">
                    <input
                      type="checkbox"
                      id={`required-${field.id || index}`}
                      checked={field.required || false}
                      onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                      className="w-4 h-4 rounded border-aloa-sand text-aloa-black focus:ring-aloa-black"
                    />
                    <label htmlFor={`required-${field.id || index}`} className="cursor-pointer">
                      <span className="font-medium text-aloa-black text-sm">Required field</span>
                      <span className="text-aloa-gray text-xs ml-2">— Users must fill this out</span>
                    </label>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleDeleteField(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete field"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state when no fields */}
          {fields.length === 0 && (
            <div className="bg-aloa-white rounded-lg shadow-md p-12 text-center">
              <div className="w-16 h-16 bg-aloa-sand rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-aloa-gray" />
              </div>
              <h3 className="text-lg font-semibold text-aloa-black mb-2">No fields yet</h3>
              <p className="text-aloa-gray mb-4">Add your first field to start building your form.</p>
              <button
                onClick={() => setShowAddFieldModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-aloa-black text-aloa-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onKeyDown={(e) => e.key === 'Escape' && setShowAddFieldModal(false)}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-semibold text-aloa-black">Add New Field</h3>
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  resetNewField();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Question/Label */}
              <div>
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Question / Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.field_label}
                  onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                  placeholder="e.g., What is your company name?"
                  autoFocus
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FIELD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setNewField({ ...newField, field_type: type.value, options: [] })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        newField.field_type === type.value
                          ? 'border-aloa-black bg-aloa-black/5'
                          : 'border-aloa-sand hover:border-aloa-gray'
                      }`}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-aloa-gray mt-0.5">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Field Name <span className="text-aloa-gray/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newField.field_name}
                  onChange={(e) => setNewField({ ...newField, field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  className="w-full px-4 py-3 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors font-mono text-sm"
                  placeholder={newField.field_label ? generateFieldName(newField.field_label) : 'auto_generated_from_label'}
                />
                <p className="text-xs text-aloa-gray mt-1">
                  Machine-readable identifier. Leave blank to auto-generate from label.
                </p>
              </div>

              {/* Placeholder (for text-based fields) */}
              {['text', 'email', 'tel', 'url', 'number', 'textarea'].includes(newField.field_type) && (
                <div>
                  <label className="block text-sm font-medium text-aloa-gray mb-2">
                    Placeholder Text <span className="text-aloa-gray/60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newField.placeholder}
                    onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                    placeholder="e.g., Enter your answer here..."
                  />
                </div>
              )}

              {/* Options (for select/radio/checkbox) */}
              {['select', 'radio', 'checkbox'].includes(newField.field_type) && (
                <div>
                  <label className="block text-sm font-medium text-aloa-gray mb-2">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newField.options.join('\n')}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value.split('\n').filter(o => o.trim()) })}
                    className="w-full px-4 py-3 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                    rows={4}
                    placeholder="Enter one option per line&#10;Option 1&#10;Option 2&#10;Option 3"
                  />
                  <p className="text-xs text-aloa-gray mt-1">
                    Enter each option on a new line.
                  </p>
                </div>
              )}

              {/* Section (Optional) */}
              <div>
                <label className="block text-sm font-medium text-aloa-gray mb-2">
                  Section <span className="text-aloa-gray/60">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newField.section}
                  onChange={(e) => setNewField({ ...newField, section: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-aloa-sand rounded-lg focus:border-aloa-black focus:outline-none transition-colors"
                  placeholder="e.g., Contact Information"
                />
                <p className="text-xs text-aloa-gray mt-1">
                  Group this field under a section heading in multi-step forms.
                </p>
              </div>

              {/* Required Toggle */}
              <div className="flex items-center gap-3 p-4 bg-aloa-sand/30 rounded-lg">
                <input
                  type="checkbox"
                  id="required-toggle"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="w-5 h-5 rounded border-aloa-sand text-aloa-black focus:ring-aloa-black"
                />
                <label htmlFor="required-toggle" className="flex-1 cursor-pointer">
                  <div className="font-medium text-aloa-black">Required Field</div>
                  <div className="text-sm text-aloa-gray">Users must fill out this field to submit the form</div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  resetNewField();
                }}
                className="px-4 py-2 text-aloa-gray hover:text-aloa-black transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddField}
                className="flex items-center gap-2 px-6 py-2 bg-aloa-black text-aloa-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
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