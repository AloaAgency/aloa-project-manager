'use client';

import React, { useState, useEffect } from 'react';
import { X, Map, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import useEscapeKey from '@/hooks/useEscapeKey';

const CreateFromSitemapModal = ({ projectId, onClose, onSuccess }) => {
  const [sitemapApplets, setSitemapApplets] = useState([]);
  const [selectedSitemap, setSelectedSitemap] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [includeFooterPages, setIncludeFooterPages] = useState(true);  // Default to true to include all pages
  const [skipHomePage, setSkipHomePage] = useState(true);

  // Add ESC key support
  useEscapeKey(onClose);

  // Fetch sitemap applets from the project
  useEffect(() => {
    const fetchSitemapApplets = async () => {
      try {
        const response = await fetch(`/api/aloa-projects/${projectId}/sitemap-applets`);
        if (!response.ok) throw new Error('Failed to fetch sitemap applets');

        const data = await response.json();
        console.log('Sitemap applets response:', data);
        setSitemapApplets(data.applets || []);
      } catch (err) {
        setError(err.message);
      }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/projectlet-templates');
        if (!response.ok) throw new Error('Failed to fetch templates');

        const data = await response.json();
        setTemplates(data.templates || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSitemapApplets();
    fetchTemplates();
  }, [projectId]);

  const handleCreate = async () => {
    if (!selectedSitemap) {
      setError('Please select a sitemap');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Get the sitemap data (it's stored in config.sitemap_data)
      const sitemapData = selectedSitemap.config?.sitemap_data || selectedSitemap.sitemap_data;

      if (!sitemapData) {
        throw new Error('No sitemap data found in the selected applet');
      }

      // Extract pages from the sitemap
      const pages = [];

      // Add navigation pages
      if (sitemapData.navigation) {
        sitemapData.navigation.forEach(page => {
          if (skipHomePage && page.name.toLowerCase() === 'home') {
            return; // Skip home page
          }
          pages.push({
            name: page.name,
            type: 'navigation',
            children: page.children || []
          });
        });
      }

      // Add footer pages if requested
      if (includeFooterPages && sitemapData.footer) {
        sitemapData.footer.forEach(page => {
          pages.push({
            name: page.name,
            type: 'footer',
            children: []
          });
        });
      }

      // Create projectlets from pages
      const response = await fetch(`/api/aloa-projects/${projectId}/create-from-sitemap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages,
          templateId: selectedTemplate,
          includeSubpages: true // Could make this an option
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create projectlets');
      }

      const result = await response.json();

      // Show success message
      const successMessage = `Created ${result.created} projectlet${result.created !== 1 ? 's' : ''} from sitemap`;

      if (onSuccess) {
        onSuccess(successMessage);
      }

      // Close modal and refresh page after a brief delay to ensure state updates
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 100);
    } catch (err) {
      setError(err.message);
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Map className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Create Projectlets from Sitemap</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Select Sitemap */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Sitemap Applet
          </label>
          {sitemapApplets.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <Map className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">No sitemap applets found in this project</p>
              <p className="text-xs text-gray-500 mt-1">Add a sitemap applet to a projectlet first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sitemapApplets.map(applet => {
                const sitemapData = applet.config?.sitemap_data || applet.sitemap_data;
                const pageCount = (sitemapData?.navigation?.length || 0) + (sitemapData?.footer?.length || 0);

                return (
                  <label
                    key={applet.id}
                    className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedSitemap?.id === applet.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="sitemap"
                        className="mt-1 mr-3"
                        checked={selectedSitemap?.id === applet.id}
                        onChange={() => setSelectedSitemap(applet)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{applet.name}</div>
                        <div className="text-sm text-gray-600">
                          From projectlet: {applet.projectlet_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {pageCount} page{pageCount !== 1 ? 's' : ''} found
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Select Template */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template for New Projectlets (Optional)
          </label>
          <select
            value={selectedTemplate || ''}
            onChange={(e) => setSelectedTemplate(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">No template (blank projectlets)</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.applet_count} applet{template.applet_count !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Options */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>Advanced Options</span>
          </button>

          {showAdvancedOptions && (
            <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeFooterPages}
                  onChange={(e) => setIncludeFooterPages(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include footer pages (Privacy Policy, Terms, etc.)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={skipHomePage}
                  onChange={(e) => setSkipHomePage(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Skip Home page (usually doesn't need its own projectlet)</span>
              </label>
            </div>
          )}
        </div>

        {/* Preview */}
        {selectedSitemap && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div className="text-sm text-gray-600">
              {(() => {
                const sitemapData = selectedSitemap.config?.sitemap_data || selectedSitemap.sitemap_data;
                let pageCount = 0;

                if (sitemapData?.navigation) {
                  pageCount += sitemapData.navigation.filter(p =>
                    !skipHomePage || p.name.toLowerCase() !== 'home'
                  ).length;
                }

                if (includeFooterPages && sitemapData?.footer) {
                  pageCount += sitemapData.footer.length;
                }

                return `Will create ${pageCount} projectlet${pageCount !== 1 ? 's' : ''}${selectedTemplate ? ' using selected template' : ''}`;
              })()}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedSitemap || isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Create Projectlets</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFromSitemapModal;