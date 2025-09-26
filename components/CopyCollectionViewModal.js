'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, User, Calendar } from 'lucide-react';

export default function CopyCollectionViewModal({
  isOpen,
  onClose,
  appletProgress,
  stakeholder,
  appletName
}) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  // Extract the data from the nested form_progress field
  const progressData = appletProgress?.form_progress || {};

  const handleDownload = async () => {
    if (!progressData?.fileUrl) {
      // If no file URL, create a text file from the content
      if (progressData?.uploadedContent) {
        const element = document.createElement('a');
        const file = new Blob([progressData.uploadedContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${progressData.uploadedFileName || 'copy_content.txt'}`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
      return;
    }

    setDownloading(true);
    try {
      // Fetch and download the file from storage
      const response = await fetch(progressData.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = progressData.uploadedFileName || 'copy_content.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Track download in database
      if (progressData.fileId) {
        await fetch('/api/project-files', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: progressData.fileId,
            action: 'download'
          })
        });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-semibold text-white">
                Copy Collection Submission
              </h2>
              <p className="text-blue-100 text-sm">
                {appletName || 'Copy Collection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {/* Stakeholder Info */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {stakeholder?.avatar_url ? (
                <img
                  src={stakeholder.avatar_url}
                  alt={stakeholder.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  {stakeholder?.full_name || stakeholder?.name || stakeholder?.email || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(appletProgress?.completed_at)}
                </p>
              </div>
            </div>

            {/* Download button */}
            {(progressData?.uploadedContent || progressData?.fileUrl) && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Downloading...' : 'Download'}</span>
              </button>
            )}
          </div>

          {/* Submission Details */}
          <div className="space-y-4">
            {/* Mode and File Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Mode:</span>
                  <span className="ml-2 text-gray-900">
                    {progressData?.mode === 'upload' ? 'File Upload' : 'Form Submission'}
                  </span>
                </div>
                {progressData?.uploadedFileName && (
                  <div>
                    <span className="font-semibold text-gray-600">File:</span>
                    <span className="ml-2 text-gray-900">
                      {progressData.uploadedFileName}
                    </span>
                  </div>
                )}
                {progressData?.uploadedContent && (
                  <div>
                    <span className="font-semibold text-gray-600">Word Count:</span>
                    <span className="ml-2 text-gray-900">
                      {progressData.uploadedContent.split(' ').length} words
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Display */}
            {progressData?.uploadedContent ? (
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold text-gray-900 mb-3">Submitted Content</h3>
                <div className="max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {progressData.uploadedContent}
                  </pre>
                </div>
              </div>
            ) : progressData?.mode === 'form' && progressData?.formCompleted ? (
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-semibold text-gray-900 mb-3">Form Completed</h3>
                <p className="text-gray-600">
                  The user completed the copy generation form. The responses have been saved
                  and can be used to generate custom copy for this page.
                </p>
                {progressData?.formResponse && (
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono bg-gray-50 p-3 rounded">
                      {JSON.stringify(progressData.formResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No content has been submitted yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}