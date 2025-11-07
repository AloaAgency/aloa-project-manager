'use client';

import { useState, useEffect } from 'react';
import { Eye, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * PrototypeReviewLauncher - Simple launcher for opening prototypes in new window
 *
 * This component is used in the CLIENT dashboard to:
 * - Display list of available prototypes
 * - Open prototype review in dedicated full-screen window
 * - Show loading states and empty states
 *
 * The actual commenting interface is in /app/prototype-review/[prototypeId]/page.js
 */

export default function PrototypeReviewLauncher({
  applet,
  projectId,
  onClose
}) {
  const [prototypes, setPrototypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrototypes();
  }, [applet.id]);

  const loadPrototypes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/aloa-projects/${projectId}/prototypes?appletId=${applet.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to load prototypes');
      }

      const data = await response.json();
      setPrototypes(data.prototypes || []);
    } catch (error) {
      console.error('Error loading prototypes:', error);
      toast.error('Failed to load prototypes');
    } finally {
      setIsLoading(false);
    }
  };

  const openPrototypeReview = (prototype) => {
    // Open in new window/tab with full screen dedicated interface
    const width = window.screen.width;
    const height = window.screen.height;

    const windowFeatures = `width=${width},height=${height},left=0,top=0,toolbar=no,menubar=no,location=no`;

    // Pass projectId and optional URL/name to the review page
    const urlParams = new URLSearchParams();
    if (projectId) urlParams.set('projectId', projectId);
    if (prototype?.name) urlParams.set('name', prototype.name);
    const candidateUrl = prototype?.source_url || prototype?.file_url || '';
    if (candidateUrl) urlParams.set('url', candidateUrl);

    const href = `/prototype-review/${prototype.id}?${urlParams.toString()}`;

    window.open(href, '_blank', windowFeatures);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (prototypes.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No prototypes available yet
        </h3>
        <p className="text-gray-500">
          Check back later for prototypes to review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">
          Review Prototypes
        </h4>
        <p className="text-sm text-blue-700">
          {applet.client_instructions || 'Click on any prototype below to view and add comments'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prototypes.map((prototype) => (
          <div
            key={prototype.id}
            className="border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group bg-white"
            onClick={() => openPrototypeReview(prototype)}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
              {prototype.file_url || prototype.screenshot_url ? (
                <img
                  src={prototype.file_url || prototype.screenshot_url}
                  alt={prototype.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-300" />
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-blue-600 transition-colors">
                {prototype.name}
              </h4>

              {prototype.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {prototype.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                <Eye className="w-3 h-3" />
                <span>Click to view and comment</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <p className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          <span>Prototypes will open in a new window for full-screen viewing</span>
        </p>
      </div>
    </div>
  );
}
