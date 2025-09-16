'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  X,
  File,
  Plus,
  Save,
  Check,
  AlertCircle,
  Download,
  Folder,
  FolderOpen,
  Search,
  Image as ImageIcon,
  Film,
  Archive,
  FileText,
  ChevronRight,
  Grid,
  List
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FileUploadConfigWithSelector({
  projectId,
  projectletId,
  applet,
  onClose
}) {
  const [config, setConfig] = useState({
    heading: applet.config?.heading || 'File Uploads',
    description: applet.config?.description || 'Upload and share project files',
    attached_files: applet.config?.attached_files || [], // Files specifically attached to this applet
    category: applet.config?.category || 'general',
    allow_client_upload: applet.config?.allow_client_upload || false,
    max_file_size: applet.config?.max_file_size || 100,
    allowed_file_types: applet.config?.allowed_file_types || ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip', 'mp4', 'mov', 'ai', 'psd', 'sketch', 'fig']
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folders, setFolders] = useState([]);

  // Track changes
  useEffect(() => {
    const originalConfig = {
      heading: applet.config?.heading || 'File Uploads',
      description: applet.config?.description || 'Upload and share project files',
      attached_files: applet.config?.attached_files || [],
      category: applet.config?.category || 'general',
      allow_client_upload: applet.config?.allow_client_upload || false,
      max_file_size: applet.config?.max_file_size || 100,
      allowed_file_types: applet.config?.allowed_file_types || ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip', 'mp4', 'mov', 'ai', 'psd', 'sketch', 'fig']
    };

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(hasChanges);
    if (hasChanges) setSaved(false);
  }, [config, applet.config]);

  // Fetch available files from project repository
  const fetchAvailableFiles = async () => {
    setLoadingFiles(true);
    try {
      const params = new URLSearchParams({
        project_id: projectId
      });

      if (currentFolderId) {
        params.append('parent_folder_id', currentFolderId);
      }

      const response = await fetch(`/api/project-files?${params}`);
      if (!response.ok) throw new Error('Failed to fetch files');

      const data = await response.json();

      // Separate folders and files
      const folderItems = data.filter(item => item.is_folder);
      const fileItems = data.filter(item => !item.is_folder);

      setFolders(folderItems);
      setAvailableFiles(fileItems);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load project files');
    } finally {
      setLoadingFiles(false);
    }
  };

  // Load files when picker opens
  useEffect(() => {
    if (showFilePicker) {
      fetchAvailableFiles();
    }
  }, [showFilePicker, currentFolderId]);

  const attachFile = (file) => {
    // Check if file is already attached
    if (config.attached_files.some(f => f.id === file.id)) {
      toast.info('File already attached');
      return;
    }

    setConfig(prev => ({
      ...prev,
      attached_files: [...prev.attached_files, file]
    }));

    toast.success(`Attached ${file.file_name}`);
  };

  const detachFile = (fileId) => {
    setConfig(prev => ({
      ...prev,
      attached_files: prev.attached_files.filter(f => f.id !== fileId)
    }));
    toast.success('File detached');
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

      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName, fileType) => {
    const ext = fileName?.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      return <Film className="w-4 h-4" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-4 h-4" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const filteredFiles = availableFiles.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Category
          </label>
          <select
            value={config.category}
            onChange={(e) => setConfig(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="general">General Files</option>
            <option value="final-deliverables">Final Deliverables</option>
            <option value="work-in-progress">Work in Progress</option>
          </select>
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
            placeholder="e.g., Style Guide, Brand Assets, Final Designs"
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

        {/* Attached Files */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attached Files ({config.attached_files.length})
          </label>

          {/* List of attached files */}
          {config.attached_files.length > 0 && (
            <div className="space-y-2 mb-3">
              {config.attached_files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-white border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file.file_name, file.file_type)}
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.file_size)}
                        {file.created_at && ` • Added ${new Date(file.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => detachFile(file.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Files Button */}
          <button
            onClick={() => setShowFilePicker(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Select files from project repository</span>
          </button>
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

          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
            💡 Select specific files from your project repository to display in this applet.
            Clients will only see the files you've attached here.
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

      {/* File Picker Modal */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Select Files from Repository</h3>
                <button
                  onClick={() => {
                    setShowFilePicker(false);
                    setCurrentFolderId(null);
                    setSearchTerm('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Breadcrumb */}
                  {currentFolderId && (
                    <button
                      onClick={() => setCurrentFolderId(null)}
                      className="text-sm text-purple-600 hover:text-purple-700 flex items-center mb-3"
                    >
                      <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                      Back to root
                    </button>
                  )}

                  {/* Folders */}
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <Folder className="w-5 h-5 text-amber-500" />
                        <span className="font-medium">{folder.file_name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}

                  {/* Files */}
                  {filteredFiles.map((file) => {
                    const isAttached = config.attached_files.some(f => f.id === file.id);
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isAttached ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.file_name, file.file_type)}
                          <div>
                            <p className="font-medium">{file.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.file_size)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => attachFile(file)}
                          disabled={isAttached}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            isAttached
                              ? 'bg-purple-600 text-white cursor-not-allowed'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {isAttached ? 'Attached' : 'Attach'}
                        </button>
                      </div>
                    );
                  })}

                  {filteredFiles.length === 0 && folders.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No files found matching your search' : 'No files in this folder'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {config.attached_files.length} file(s) selected
                </p>
                <button
                  onClick={() => {
                    setShowFilePicker(false);
                    setCurrentFolderId(null);
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}