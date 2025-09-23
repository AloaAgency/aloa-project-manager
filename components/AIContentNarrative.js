'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function AIContentNarrative({
  applet,
  projectId,
  userId,
  isViewOnly = true,
  onClose,
  onComplete
}) {
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  useEffect(() => {
    if (applet) {
      // Load narrative content from applet config
      if (applet.config?.generatedContent) {
        setNarrative(applet.config.generatedContent);
        // Expand all sections by default
        const allExpanded = {};
        Object.keys(applet.config.generatedContent).forEach(key => {
          allExpanded[key] = true;
        });
        setExpandedSections(allExpanded);
      }

      // Check if user has already acknowledged
      setHasAcknowledged(applet.user_completed_at !== null);
      setLoading(false);
    }
  }, [applet]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleAcknowledge = async () => {
    try {
      // Mark as completed
      const response = await fetch(`/api/aloa-projects/${projectId}/client-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appletId: applet.id,
          status: 'completed',
          interactionType: 'narrative_review',
          userId: userId,
          data: {
            acknowledged_at: new Date().toISOString(),
            narrative_reviewed: true,
            page_name: applet.config?.pageName || 'Page'
          }
        })
      });

      if (response.ok) {
        setHasAcknowledged(true);
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {

    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!narrative || Object.keys(narrative).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Content Not Yet Available
        </h3>
        <p className="text-gray-500 max-w-md">
          The narrative content for this page is being prepared. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <div className="flex items-start gap-3">
          <FileText className="w-6 h-6 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {applet.config?.pageName || 'Page'} Content Structure
            </h3>
            <p className="text-gray-600">
              This is the AI-generated narrative structure for your {applet.config?.pageName?.toLowerCase() || 'page'}.
              Each section below represents a key component of your page's content, crafted based on your
              form responses and designed to guide the visual design process.
            </p>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {Object.entries(narrative).map(([section, content], index) => (
          <div key={section} className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => toggleSection(section)}
              className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-semibold">
                  {index + 1}
                </span>
                <h4 className="text-lg font-semibold text-gray-900">
                  {section}
                </h4>
              </div>
              {expandedSections[section] ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections[section] && (
              <div className="px-6 py-4 bg-white">
                <div className="prose prose-gray max-w-none">
                  {content.split('\n').map((paragraph, pIndex) => (
                    paragraph.trim() && (
                      <p key={pIndex} className="text-gray-700 mb-3 leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Design Notes */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-900 mb-2">Design Team Notes</h4>
        <p className="text-sm text-amber-800">
          This narrative structure serves as the content foundation for the visual design.
          Each section should be thoughtfully translated into visual elements, maintaining
          the hierarchy and flow established in this document. The content has been optimized
          for web presentation and user engagement.
        </p>
      </div>

      {/* Acknowledgment Section */}
      {!hasAcknowledged && (
        <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Review Required</h3>
              <p className="text-gray-600">
                Please carefully review the narrative content structure above for your {applet.config?.pageName?.toLowerCase() || 'page'}.
                This content will guide the visual design process, so it's important that you're satisfied with how your information has been organized.
              </p>
            </div>
          </div>
          <div className="bg-white/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>To complete this task:</strong>
            </p>
            <ol className="text-sm text-gray-600 mt-2 space-y-1 list-decimal list-inside">
              <li>Read through each section above</li>
              <li>Ensure the content accurately reflects your requirements</li>
              <li>Click the button below to confirm your review</li>
            </ol>
          </div>
          <button
            onClick={handleAcknowledge}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <CheckCircle className="w-5 h-5" />
            Mark as Reviewed - I Confirm This Content
          </button>
        </div>
      )}

      {/* Already Acknowledged Message */}
      {hasAcknowledged && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              You reviewed this content on {new Date(applet.user_completed_at || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}