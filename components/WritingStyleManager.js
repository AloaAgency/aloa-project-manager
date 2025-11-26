'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Feather,
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Edit2,
  X,
  Plus,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const SAMPLE_TYPES = [
  { value: 'general', label: 'General Writing' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email', label: 'Email' },
  { value: 'blog', label: 'Blog/Article' },
  { value: 'formal', label: 'Formal/Business' },
  { value: 'casual', label: 'Casual/Conversational' }
];

const FORMALITY_LEVELS = [
  { value: 'very_formal', label: 'Very Formal' },
  { value: 'formal', label: 'Formal' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'casual', label: 'Casual' },
  { value: 'very_casual', label: 'Very Casual' }
];

const VOICE_OPTIONS = [
  { value: 'first_person_singular', label: 'First Person Singular (I/me)' },
  { value: 'first_person_plural', label: 'First Person Plural (We/us)' },
  { value: 'third_person', label: 'Third Person (They/the company)' },
  { value: 'mixed', label: 'Mixed' }
];

export default function WritingStyleManager({ projectId }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [writingStyle, setWritingStyle] = useState(null);
  const [samples, setSamples] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Form states for editing
  const [editedStyle, setEditedStyle] = useState(null);
  const [newToneKeyword, setNewToneKeyword] = useState('');
  const [newDoNotUse, setNewDoNotUse] = useState('');
  const [newAlwaysUse, setNewAlwaysUse] = useState('');

  // Upload form
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadSampleType, setUploadSampleType] = useState('general');

  // Fetch data on mount
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-writing-style/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setWritingStyle(data.writingStyle);
      setEditedStyle(data.writingStyle);
      setSamples(data.samples || []);
    } catch (error) {
      console.error('Error fetching writing style:', error);
      toast.error('Failed to load writing style');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('description', uploadDescription);
      formData.append('sample_type', uploadSampleType);

      const response = await fetch(`/api/project-writing-style/${projectId}/samples`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      toast.success(data.message);
      setSamples(prev => [data.sample, ...prev]);

      // Reset form
      setUploadFile(null);
      setUploadDescription('');
      setUploadSampleType('general');

      // Clear file input
      const fileInput = document.getElementById('writing-sample-upload');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload sample');
    } finally {
      setUploading(false);
    }
  };

  // Handle sample deletion
  const handleDeleteSample = async (sampleId) => {
    if (!confirm('Are you sure you want to delete this writing sample?')) return;

    try {
      const response = await fetch(
        `/api/project-writing-style/${projectId}/samples?sampleId=${sampleId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Delete failed');

      toast.success('Sample deleted');
      setSamples(prev => prev.filter(s => s.id !== sampleId));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete sample');
    }
  };

  // Analyze samples
  const handleAnalyze = async () => {
    if (samples.length === 0) {
      toast.error('Please upload at least one writing sample first');
      return;
    }

    try {
      setAnalyzing(true);
      const response = await fetch(`/api/project-writing-style/${projectId}/analyze`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      toast.success(data.message);
      setWritingStyle(data.writingStyle);
      setEditedStyle(data.writingStyle);
      setHasChanges(false);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze writing style');
    } finally {
      setAnalyzing(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/project-writing-style/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedStyle)
      });

      if (!response.ok) throw new Error('Save failed');

      const data = await response.json();
      setWritingStyle(data.writingStyle);
      setEditedStyle(data.writingStyle);
      setHasChanges(false);
      toast.success('Writing style saved');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save writing style');
    } finally {
      setSaving(false);
    }
  };

  // Update edited style
  const updateStyle = (field, value) => {
    setEditedStyle(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Array helpers
  const addToArray = (field, value, setter) => {
    if (!value.trim()) return;
    const currentArray = editedStyle?.[field] || [];
    if (!currentArray.includes(value.trim())) {
      updateStyle(field, [...currentArray, value.trim()]);
    }
    setter('');
  };

  const removeFromArray = (field, index) => {
    const currentArray = editedStyle?.[field] || [];
    updateStyle(field, currentArray.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading writing style...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-6 hover:opacity-80 transition-opacity flex items-center justify-between"
      >
        <div className="flex items-center">
          <Feather className="w-6 h-6 mr-2 text-indigo-600" />
          <h2 className="text-2xl font-bold">Writing Style</h2>
          {hasChanges && (
            <span className="ml-3 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
          {samples.length > 0 && (
            <span className="ml-3 text-sm text-gray-500">
              {samples.length} sample{samples.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {!isCollapsed && (
        <div className="px-6 pb-6 space-y-6">
          {/* Upload Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-indigo-600" />
              Upload Writing Samples
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload documents that represent your client's writing style. The AI will analyze these to learn their voice.
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File (.txt, .md, .pdf, .docx)
                  </label>
                  <input
                    id="writing-sample-upload"
                    type="file"
                    accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Type
                  </label>
                  <select
                    value={uploadSampleType}
                    onChange={(e) => setUploadSampleType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SAMPLE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="e.g., CEO's LinkedIn posts from Q4 2024"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Sample'}
              </button>
            </form>
          </div>

          {/* Samples List */}
          {samples.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                Uploaded Samples ({samples.length})
              </h3>
              <div className="space-y-2">
                {samples.map(sample => (
                  <div key={sample.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-sm">{sample.file_name}</div>
                        <div className="text-xs text-gray-500">
                          {sample.word_count} words • {SAMPLE_TYPES.find(t => t.value === sample.sample_type)?.label || sample.sample_type}
                          {sample.description && ` • ${sample.description}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSample(sample.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete sample"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Analyze Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || samples.length === 0}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  <Sparkles className="w-5 h-5" />
                  {analyzing ? 'Analyzing Writing Style...' : 'Analyze Writing Style with AI'}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  AI will analyze all samples and generate an editable style guide
                </p>
              </div>
            </div>
          )}

          {/* Style Guide Section */}
          {editedStyle && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-indigo-600" />
                  Style Guide
                </h3>
                {editedStyle.analysis_confidence && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Confidence:</span>
                    <span className={`font-medium ${
                      editedStyle.analysis_confidence >= 0.8 ? 'text-green-600' :
                      editedStyle.analysis_confidence >= 0.6 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {Math.round(editedStyle.analysis_confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Style Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Style Summary
                  </label>
                  <textarea
                    value={editedStyle.style_summary || ''}
                    onChange={(e) => updateStyle('style_summary', e.target.value)}
                    rows={3}
                    placeholder="Overall description of the writing style..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Quick Settings Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Formality Level
                    </label>
                    <select
                      value={editedStyle.formality_level || 'neutral'}
                      onChange={(e) => updateStyle('formality_level', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {FORMALITY_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voice Perspective
                    </label>
                    <select
                      value={editedStyle.voice_perspective || 'first_person_plural'}
                      onChange={(e) => updateStyle('voice_perspective', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {VOICE_OPTIONS.map(voice => (
                        <option key={voice.value} value={voice.value}>{voice.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tone Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tone Keywords
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editedStyle.tone_keywords || []).map((keyword, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {keyword}
                        <button
                          onClick={() => removeFromArray('tone_keywords', index)}
                          className="hover:text-indigo-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newToneKeyword}
                      onChange={(e) => setNewToneKeyword(e.target.value)}
                      placeholder="Add tone keyword..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('tone_keywords', newToneKeyword, setNewToneKeyword))}
                    />
                    <button
                      onClick={() => addToArray('tone_keywords', newToneKeyword, setNewToneKeyword)}
                      className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Do Not Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-red-600">✕</span> Words/Phrases to Avoid
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editedStyle.do_not_use || []).map((phrase, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        {phrase}
                        <button
                          onClick={() => removeFromArray('do_not_use', index)}
                          className="hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDoNotUse}
                      onChange={(e) => setNewDoNotUse(e.target.value)}
                      placeholder="Add phrase to avoid..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('do_not_use', newDoNotUse, setNewDoNotUse))}
                    />
                    <button
                      onClick={() => addToArray('do_not_use', newDoNotUse, setNewDoNotUse)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Always Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-green-600">✓</span> Preferred Words/Phrases
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editedStyle.always_use || []).map((phrase, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {phrase}
                        <button
                          onClick={() => removeFromArray('always_use', index)}
                          className="hover:text-green-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAlwaysUse}
                      onChange={(e) => setNewAlwaysUse(e.target.value)}
                      placeholder="Add preferred phrase..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('always_use', newAlwaysUse, setNewAlwaysUse))}
                    />
                    <button
                      onClick={() => addToArray('always_use', newAlwaysUse, setNewAlwaysUse)}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={editedStyle.admin_notes || ''}
                    onChange={(e) => updateStyle('admin_notes', e.target.value)}
                    rows={3}
                    placeholder="Any additional style notes or guidelines..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Detailed Style Attributes (if available) */}
                {editedStyle.style_attributes && Object.keys(editedStyle.style_attributes).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Detailed Style Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {Object.entries(editedStyle.style_attributes).map(([key, value]) => {
                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="col-span-2">
                              <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {value.map((item, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{item}</span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={key}>
                            <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="ml-2 text-gray-800">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Last Analyzed Info */}
                {editedStyle.last_analyzed_at && (
                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                    Last analyzed: {new Date(editedStyle.last_analyzed_at).toLocaleString()}
                    • {editedStyle.samples_analyzed} sample{editedStyle.samples_analyzed !== 1 ? 's' : ''} analyzed
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!editedStyle && samples.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Feather className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No writing style defined yet</p>
              <p className="text-sm mt-1">Upload writing samples to teach the AI this project's voice</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
