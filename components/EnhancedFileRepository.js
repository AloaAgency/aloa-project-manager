'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  X,
  File,
  Download,
  Trash2,
  FolderOpen,
  Folder,
  FolderPlus,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  ChevronDown,
  ChevronRight,
  Grid,
  List,
  ArrowLeft,
  MoreVertical,
  Plus,
  Move,
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET = 'project-files';
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default function EnhancedFileRepository({
  projectId,
  canUpload = true,
  canDelete = false,
  canCreateFolders = true,
  onFileChange
}) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    fetchContents();
  }, [projectId, currentFolderId]);

  const fetchContents = async () => {
    try {
      const params = new URLSearchParams({
        project_id: projectId
      });

      if (currentFolderId) {
        params.append('parent_folder_id', currentFolderId);
      }

      const response = await fetch(`/api/project-files?${params}`);
      const result = await response.json();

      if (result.error) {
        console.error('Error fetching files:', result.error);
        return;
      }

      // Handle both response formats
      const data = result.files || result;

      // Separate folders and files
      const folderItems = (Array.isArray(data) ? data : []).filter(item => item.is_folder);
      const fileItems = (Array.isArray(data) ? data : []).filter(item => !item.is_folder);

      setFolders(folderItems);
      setFiles(fileItems);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target?.files || e.dataTransfer?.files || []);
    if (uploadedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    for (const file of uploadedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 200MB.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('parent_folder_id', currentFolderId || '');
        formData.append('uploaded_by', 'client');

        const response = await fetch('/api/project-files', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }

        const result = await response.json();

        // Show success message
        toast.success(`${file.name} uploaded successfully`);

        const percent = ((uploadedFiles.indexOf(file) + 1) / uploadedFiles.length) * 100;
        setUploadProgress(Math.round(percent));
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    // Refresh files list
    await fetchContents();
    if (onFileChange) onFileChange();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const response = await fetch('/api/project-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_name: newFolderName.trim(),
          is_folder: true,
          parent_folder_id: currentFolderId,
          uploaded_by: 'client'
        })
      });

      if (!response.ok) throw new Error('Failed to create folder');

      await fetchContents();
      toast.success('Folder created successfully');
      if (onFileChange) onFileChange();
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleMoveFile = async (fileId, targetFolderId) => {
    try {
      const response = await fetch('/api/project-files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fileId,
          parent_folder_id: targetFolderId
        })
      });

      if (!response.ok) throw new Error('Failed to move file');

      await fetchContents();
      toast.success('File moved successfully');
      if (onFileChange) onFileChange();
    } catch (error) {
      console.error('Error moving file:', error);
      toast.error('Failed to move file');
    }
  };

  const handleNavigateToFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setCurrentPath([...currentPath, { id: folder.id, name: folder.file_name }]);
  };

  const handleNavigateBack = () => {
    if (currentPath.length > 0) {
      const newPath = [...currentPath];
      newPath.pop();
      setCurrentPath(newPath);
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    }
  };

  const handleNavigateToPath = (index) => {
    if (index === -1) {
      // Navigate to root
      setCurrentPath([]);
      setCurrentFolderId(null);
    } else {
      const newPath = currentPath.slice(0, index + 1);
      setCurrentPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
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

      // Get download URL
      const url = getFileUrl(file);
      if (url) {
        window.open(url, '_blank');
        toast.success('Download started');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.file_name}?`)) return;

    try {
      const response = await fetch(`/api/project-files?id=${item.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      await fetchContents();
      toast.success(`${item.is_folder ? 'Folder' : 'File'} deleted successfully`);
      if (onFileChange) onFileChange();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(`Failed to delete ${item.is_folder ? 'folder' : 'file'}`);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a new name');
      return;
    }

    try {
      const response = await fetch('/api/project-files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: renameItem.id,
          file_name: newName.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to rename');

      await fetchContents();
      toast.success(`${renameItem.is_folder ? 'Folder' : 'File'} renamed successfully`);
      if (onFileChange) onFileChange();
      setShowRenameDialog(false);
      setRenameItem(null);
      setNewName('');
    } catch (error) {
      console.error('Error renaming:', error);
      toast.error(`Failed to rename ${renameItem.is_folder ? 'folder' : 'file'}`);
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setSelectedItem(item);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, folder) => {
    e.preventDefault();
    if (draggedItem && !draggedItem.is_folder) {
      setDragOverFolder(folder.id);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItem && !draggedItem.is_folder && targetFolder.is_folder) {
      await handleMoveFile(draggedItem.id, targetFolder.id);
    }

    handleDragEnd();
  };

  const handleDropOnRoot = async (e) => {
    e.preventDefault();

    // Only handle if not dropping on a folder
    if (dragOverFolder) return;

    // Handle file drop from system
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e);
    }
    // Handle file move to root or current folder
    else if (draggedItem && !draggedItem.is_folder) {
      await handleMoveFile(draggedItem.id, currentFolderId);
    }

    handleDragEnd();
  };

  const getFileIcon = (fileName, fileType) => {
    const ext = fileName?.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <ImageIcon className="w-5 h-5" />;
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

  const isImageFile = (fileName) => {
    const ext = fileName?.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
  };

  const getFileUrl = (file) => {
    // Debug logging
    console.log('Getting URL for file:', file.file_name, {
      url: file.url,
      storage_path: file.storage_path
    });

    if (file.url) {
      console.log('Using file.url:', file.url);
      return file.url;
    }
    if (file.storage_path) {
      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(file.storage_path);
      console.log('Generated public URL:', data?.publicUrl);
      return data?.publicUrl || null;
    }
    return null;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter files based on search
  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredFolders = folders.filter(folder =>
    folder.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

          {canCreateFolders && (
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          )}

          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Files</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Uploading files...</span>
            <span className="text-sm font-medium text-purple-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Drop Zone and Content Area */}
      <div
        ref={dropZoneRef}
        className="min-h-[400px]"
        onDragOver={(e) => {
          // Only prevent default for external files
          if (e.dataTransfer.files?.length > 0 || !draggedItem) {
            handleDragOver(e);
          }
        }}
        onDrop={handleDropOnRoot}
      >
        {/* Breadcrumb Navigation with Drop Zones */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <button
            onClick={() => handleNavigateToPath(-1)}
            className={`hover:text-purple-600 flex items-center px-2 py-1 rounded ${
              draggedItem && dragOverFolder === 'root' ? 'bg-purple-100 text-purple-700' : ''
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              if (draggedItem && !draggedItem.is_folder) {
                setDragOverFolder('root');
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setDragOverFolder(null);
              }
            }}
            onDrop={async (e) => {
              e.preventDefault();
              if (draggedItem && !draggedItem.is_folder) {
                await handleMoveFile(draggedItem.id, null);
              }
              handleDragEnd();
            }}
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Root
          </button>
          {currentPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4" />
              <button
                onClick={() => handleNavigateToPath(index)}
                className={`hover:text-purple-600 px-2 py-1 rounded ${
                  draggedItem && dragOverFolder === folder.id ? 'bg-purple-100 text-purple-700' : ''
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (draggedItem && !draggedItem.is_folder && draggedItem.parent_folder_id !== folder.id) {
                    setDragOverFolder(folder.id);
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverFolder(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (draggedItem && !draggedItem.is_folder) {
                    await handleMoveFile(draggedItem.id, folder.id);
                  }
                  handleDragEnd();
                }}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Back Button and Parent Folder Drop Zone */}
        {currentPath.length > 0 && (
          <div className="mb-4 flex items-center space-x-3">
            <button
              onClick={handleNavigateBack}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {draggedItem && !draggedItem.is_folder && (
              <div
                className={`flex-1 px-4 py-2 border-2 border-dashed rounded-lg text-sm text-gray-500 flex items-center justify-center transition-all ${
                  dragOverFolder === 'parent'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverFolder('parent');
                }}
                onDragOver={handleDragOver}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverFolder(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const parentId = currentPath.length > 1
                    ? currentPath[currentPath.length - 2].id
                    : null;
                  await handleMoveFile(draggedItem.id, parentId);
                  handleDragEnd();
                }}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Drop here to move to parent folder
              </div>
            )}
          </div>
        )}

        {/* File/Folder Grid or List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Folders */}
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                className={`relative group cursor-pointer ${
                  dragOverFolder === folder.id ? 'ring-2 ring-purple-500' : ''
                }`}
                onDoubleClick={() => handleNavigateToFolder(folder)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                onDragEnter={(e) => handleDragEnter(e, folder)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder)}
              >
                <div className={`p-4 border rounded-lg transition-all ${
                  dragOverFolder === folder.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}>
                  <div className="flex flex-col items-center space-y-2">
                    <Folder className="w-12 h-12 text-amber-500" />
                    <span className="text-sm text-center font-medium truncate w-full">
                      {folder.file_name}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(folder);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Files */}
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="relative group cursor-pointer"
                draggable={!file.is_folder}
                onDragStart={(e) => handleDragStart(e, file)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, file)}
              >
                <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all">
                  <div className="flex flex-col items-center space-y-2">
                    {isImageFile(file.file_name) ? (
                      <div className="w-full h-24 relative rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                        {getFileUrl(file) ? (
                          <img
                            src={getFileUrl(file)}
                            alt={file.file_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Show image icon on error
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-full h-full flex items-center justify-center';
                              fallback.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                              e.target.parentElement.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center">
                        {getFileIcon(file.file_name, file.file_type)}
                      </div>
                    )}
                    <span className="text-xs text-center truncate w-full" title={file.file_name}>
                      {file.file_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <tr
                    key={folder.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      dragOverFolder === folder.id ? 'bg-purple-50' : ''
                    }`}
                    onDoubleClick={() => handleNavigateToFolder(folder)}
                    onContextMenu={(e) => handleContextMenu(e, folder)}
                    onDragEnter={(e) => handleDragEnter(e, folder)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <Folder className="w-5 h-5 text-amber-500" />
                        <span className="font-medium">{folder.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(folder.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(folder)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-gray-50"
                    draggable={!file.is_folder}
                    onDragStart={(e) => handleDragStart(e, file)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {isImageFile(file.file_name) && getFileUrl(file) ? (
                          <div className="w-10 h-10 relative rounded overflow-hidden bg-gray-100">
                            <img
                              src={getFileUrl(file)}
                              alt={file.file_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                              }}
                            />
                          </div>
                        ) : (
                          getFileIcon(file.file_name, file.file_type)
                        )}
                        <span>{file.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(file)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredFiles.length === 0 && filteredFolders.length === 0 && (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No files or folders found matching your search' : 'No files or folders yet'}
            </p>
            {canUpload && !searchTerm && (
              <>
                <p className="text-sm text-gray-400 mt-2">Drag and drop files here or click to upload</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Upload your first file
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && renameItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">
              Rename {renameItem.is_folder ? 'Folder' : 'File'}
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setRenameItem(null);
                  setNewName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          {selectedItem && !selectedItem.is_folder && (
            <>
              <button
                onClick={() => {
                  handleDownload(selectedItem);
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              {draggedItem && (
                <button
                  onClick={() => {
                    toast.info('Drag the file to a folder to move it');
                    setShowContextMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Move className="w-4 h-4" />
                  <span>Move to folder</span>
                </button>
              )}
            </>
          )}
          {selectedItem && selectedItem.is_folder && (
            <button
              onClick={() => {
                handleNavigateToFolder(selectedItem);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open</span>
            </button>
          )}
          <button
            onClick={() => {
              setRenameItem(selectedItem);
              setNewName(selectedItem.file_name);
              setShowRenameDialog(true);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Rename</span>
          </button>
          {canDelete && (
            <button
              onClick={() => {
                handleDelete(selectedItem);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}