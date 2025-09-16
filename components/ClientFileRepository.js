'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  X,
  File,
  Download,
  Trash2,
  FolderOpen,
  Folder,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Image,
  Film,
  Archive,
  ChevronDown,
  ChevronRight,
  Grid,
  List
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET = 'project-files';
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default function ClientFileRepository({ projectId, canUpload = true, canDelete = false }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [expandedCategories, setExpandedCategories] = useState({
    'general': true,
    'work-in-progress': true,
    'final-deliverables': true
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/project-files?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create storage path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `projects/${projectId}/client-uploads/${timestamp}_${safeName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          }
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Save file metadata to database
      const response = await fetch('/api/project-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          category: 'general',
          uploaded_by: 'client',
          url: urlData.publicUrl
        })
      });

      if (!response.ok) throw new Error('Failed to save file metadata');

      // Refresh files list
      await fetchFiles();
      toast.success('File uploaded successfully');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file) => {
    try {
      // Track download
      await fetch('/api/project-files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: file.id,
          action: 'download'
        })
      });

      // Download file
      if (file.url) {
        window.open(file.url, '_blank');
      } else if (file.storage_path) {
        const { data } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(file.storage_path);
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Are you sure you want to delete ${file.file_name}?`)) {
      return;
    }

    try {
      // Delete from storage if path exists
      if (file.storage_path) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([file.storage_path]);
      }

      // Delete from database
      const response = await fetch(`/api/project-files/${file.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete file');

      // Refresh files list
      await fetchFiles();
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const getFileIcon = (fileName, fileType) => {
    const ext = fileName.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <Image className="w-5 h-5" />;
    }
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      return <Film className="w-5 h-5" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-5 h-5" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryLabel = (category) => {
    switch(category) {
      case 'final-deliverables': return 'Final Deliverables';
      case 'work-in-progress': return 'Work in Progress';
      default: return 'General Files';
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'final-deliverables': return 'text-green-600 bg-green-50';
      case 'work-in-progress': return 'text-amber-600 bg-amber-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Filter files based on search and category
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group files by category
  const groupedFiles = filteredFiles.reduce((acc, file) => {
    const category = file.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(file);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">File Repository</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex space-x-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Categories</option>
          <option value="general">General Files</option>
          <option value="work-in-progress">Work in Progress</option>
          <option value="final-deliverables">Final Deliverables</option>
        </select>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Uploading...</span>
            <span className="text-sm text-purple-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Files Display */}
      {Object.keys(groupedFiles).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No files found</p>
          {canUpload && (
            <p className="text-sm text-gray-500 mt-1">Click "Upload File" to add your first file</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedFiles).map(([category, categoryFiles]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategories(prev => ({
                  ...prev,
                  [category]: !prev[category]
                }))}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${getCategoryColor(category)}`}
              >
                <div className="flex items-center space-x-2">
                  {expandedCategories[category] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <Folder className="w-5 h-5" />
                  <span className="font-medium">{getCategoryLabel(category)}</span>
                  <span className="text-sm">({categoryFiles.length})</span>
                </div>
              </button>

              {expandedCategories[category] && (
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4' : 'divide-y'}>
                  {categoryFiles.map((file) => (
                    <div
                      key={file.id}
                      className={viewMode === 'grid'
                        ? 'border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer'
                        : 'p-4 hover:bg-gray-50 transition-colors'
                      }
                    >
                      {viewMode === 'grid' ? (
                        // Grid View
                        <div className="space-y-3">
                          <div className="flex justify-center text-gray-600">
                            {getFileIcon(file.file_name, file.file_type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 truncate" title={file.file_name}>
                              {file.file_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatFileSize(file.file_size)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(file.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex justify-between">
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-2 hover:bg-purple-50 rounded text-purple-600"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {canDelete && file.uploaded_by === 'client' && (
                              <button
                                onClick={() => handleDelete(file)}
                                className="p-2 hover:bg-red-50 rounded text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        // List View
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-gray-600">
                              {getFileIcon(file.file_name, file.file_type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{file.file_name}</p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                                {file.uploaded_by && (
                                  <span className="ml-2">• Uploaded by {file.uploaded_by}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-2 hover:bg-purple-50 rounded text-purple-600"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {canDelete && file.uploaded_by === 'client' && (
                              <button
                                onClick={() => handleDelete(file)}
                                className="p-2 hover:bg-red-50 rounded text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
        <span>{filteredFiles.length} file(s)</span>
        <span>Total size: {formatFileSize(filteredFiles.reduce((acc, file) => acc + (file.file_size || 0), 0))}</span>
      </div>
    </div>
  );
}