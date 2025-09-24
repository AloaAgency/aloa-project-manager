'use client';

import { useState, useEffect } from 'react';
import { Upload, X, File, Plus, Save, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FileUploadConfig({ 
  projectId, 
  projectletId, 
  applet, 
  onClose 
}) {
  const [config, setConfig] = useState({
    heading: applet.config?.heading || 'File Uploads',
    description: applet.config?.description || 'Upload and share project files',
    files: applet.config?.files || [],
    allow_client_upload: applet.config?.allow_client_upload || false,
    max_file_size: applet.config?.max_file_size || 100, // MB - default 100MB
    allowed_file_types: applet.config?.allowed_file_types || ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip']
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const originalConfig = {
      heading: applet.config?.heading || 'File Uploads',
      description: applet.config?.description || 'Upload and share project files',
      files: applet.config?.files || [],
      allow_client_upload: applet.config?.allow_client_upload || false,
      max_file_size: applet.config?.max_file_size || 100,
      allowed_file_types: applet.config?.allowed_file_types || ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip']
    };

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(hasChanges);
    if (hasChanges) setSaved(false);
  }, [config, applet.config]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > config.max_file_size) {
      toast.error(`File size exceeds ${config.max_file_size}MB limit`);
      return;
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!config.allowed_file_types.includes(fileExtension)) {
      toast.error(`File type .${fileExtension} is not allowed`);
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64 for now (until we set up proper server-side upload)
      const reader = new FileReader();

      reader.onload = () => {
        const base64String = reader.result;

        // Add file to config with base64 data
        const newFile = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64String, // Store as base64 for security
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'admin'
        };

        setConfig(prev => ({
          ...prev,
          files: [...prev.files, newFile]
        }));

        toast.success('File uploaded successfully');
        setUploading(false);
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploading(false);
      };

      // Read file as data URL (includes base64)
      reader.readAsDataURL(file);
    } catch (error) {

      toast.error('Failed to upload file');
      setUploading(false);
    }
  };

  const removeFile = (fileId) => {
    // Simply remove from config
    setConfig(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));

    toast.success('File removed');
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(
        `/api/aloa-projects/${projectId}/projectlets/${projectletId}/applets/${applet.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        }
      );

      if (!response.ok) throw new Error('Failed to save');

      setHasChanges(false);
      setSaved(true);
      toast.success('File upload configuration saved');

      // Reset saved indicator after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {

      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    const docExts = ['pdf', 'doc', 'docx', 'txt'];

    if (imageExts.includes(ext)) return '🖼️';
    if (docExts.includes(ext)) return '📄';
    if (ext === 'zip' || ext === 'rar') return '📦';
    return '📎';
  };

  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mt-2">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-gray-900">File Upload Configuration</h4>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Heading */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heading
          </label>
          <input
            type="text"
            value={config.heading}
            onChange={(e) => setConfig(prev => ({ ...prev, heading: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="e.g., Project Deliverables"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            rows={2}
            placeholder="Describe what files are being shared..."
          />
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Uploaded Files
          </label>

          {/* Existing Files */}
          {config.files.length > 0 && (
            <div className="space-y-2 mb-3">
              {config.files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-white border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getFileIcon(file.name)}</span>
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <label className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              accept={config.allowed_file_types.map(ext => `.${ext}`).join(',')}
              className="hidden"
              disabled={uploading}
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload file</p>
                  <p className="text-xs text-gray-500">
                    Max {config.max_file_size}MB • {config.allowed_file_types.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Settings */}
        <div className="space-y-3 border-t pt-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.allow_client_upload}
              onChange={(e) => setConfig(prev => ({ ...prev, allow_client_upload: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Allow clients to upload files</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max File Size (MB)
              </label>
              <input
                type="number"
                value={config.max_file_size}
                onChange={(e) => setConfig(prev => ({ ...prev, max_file_size: parseInt(e.target.value) || 10 }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Allowed File Types
              </label>
              <input
                type="text"
                value={config.allowed_file_types.join(', ')}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  allowed_file_types: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="pdf, jpg, png"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end items-center space-x-2 pt-2 border-t">
          {hasChanges && !saved && (
            <span className="text-xs text-amber-600 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved changes
            </span>
          )}
          {saved && (
            <span className="text-xs text-green-600 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              hasChanges 
                ? 'bg-black text-white hover:bg-gray-800' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}