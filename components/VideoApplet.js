'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Video, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoApplet = ({
  applet,
  isViewOnly,
  onClose,
  onComplete,
  projectId,
  userId
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);

  // Load existing progress
  useEffect(() => {
    if (applet.form_progress) {
      setHasStarted(applet.form_progress.hasStarted || false);
      setIsCompleted(applet.form_progress.isCompleted || false);
    }
  }, [applet]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Parse video URL to get embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;

    // Vimeo
    if (url.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=0&title=0&byline=0&portrait=0`;
      }
    }

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId;
      if (url.includes('youtube.com')) {
        const match = url.match(/[?&]v=([^&]+)/);
        videoId = match ? match[1] : null;
      } else {
        const match = url.match(/youtu\.be\/([^?]+)/);
        videoId = match ? match[1] : null;
      }
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`;
      }
    }

    // Direct video URL (mp4, webm, etc.)
    return url;
  };

  const embedUrl = getEmbedUrl(applet.config?.video_url);
  const isDirectVideo = embedUrl === applet.config?.video_url;


  // Handle video play
  const handlePlay = async () => {
    setIsPlaying(true);

    if (!hasStarted) {
      setHasStarted(true);
      await saveProgress('in_progress', 0);
    }
  };

  // Manual mark as completed
  const handleMarkAsCompleted = async () => {
    if (!isCompleted) {
      setIsCompleted(true);
      await saveProgress('completed', 100);

      // Trigger confetti
      if (onComplete) {
        onComplete();
      }
    }
  };

  // Save progress to database
  const saveProgress = async (status, progress = 100) => {
    try {
      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appletId: applet.id,
          status: status,
          interactionType: 'video_progress',
          userId: userId,
          data: {
            form_progress: {
              hasStarted: true,
              isCompleted: status === 'completed',
              progress: progress,
              lastWatchedAt: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      // Update completion percentage based on status
      const completionPercentage = status === 'completed' ? 100 :
                                   status === 'in_progress' ? 50 : 0;

      // Call the update_applet_progress stored procedure
      await fetch(`/api/aloa-projects/${projectId}/applet-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appletId: applet.id,
          userId: userId,
          status: status,
          completionPercentage: completionPercentage
        })
      });

    } catch (error) {
      console.error('Failed to save video progress:', error);
    }
  };


  if (!embedUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Video Not Available</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600">No video has been configured for this applet yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-rose-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Video className="h-5 w-5 text-rose-500" />
                  Video: {applet.config?.title || 'Presentation'}
                </h3>
                {isCompleted && (
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {applet.config?.description && (
          <div className="px-6 py-4 bg-gray-50 border-b">
            <p className="text-gray-700">{applet.config.description}</p>
          </div>
        )}

        {/* Video Container */}
        <div className="relative bg-black aspect-video">
          {isDirectVideo ? (
            <video
              ref={videoRef}
              src={embedUrl}
              controls
              className="w-full h-full"
              onPlay={handlePlay}
              controlsList="nodownload"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="relative w-full h-full">
              {!isPlaying && (
                <div
                  onClick={() => {
                    setIsPlaying(true);
                    handlePlay();
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer hover:bg-black/40 transition-colors z-10"
                >
                  <div className="bg-white rounded-full p-6 shadow-lg">
                    <Play className="h-12 w-12 text-rose-600 ml-1" />
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                onLoad={() => {
                  // Mark as started when iframe loads and play is clicked
                  if (isPlaying && !hasStarted) {
                    handlePlay();
                  }
                }}
              />
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {isViewOnly ? (
                <span>This video is view-only</span>
              ) : (
                <span>
                  {isCompleted
                    ? 'You have completed this video'
                    : 'Watch the video and mark as completed when finished'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isViewOnly && !isCompleted && (
                <button
                  onClick={handleMarkAsCompleted}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Mark as Completed
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoApplet;