'use client';

import { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, BarChart, Target, Lightbulb, FileText, CheckCircle } from 'lucide-react';

export default function AIFormResults({ applet, isViewOnly = false }) {
  const [isExpanded, setIsExpanded] = useState({
    summary: true,
    metrics: true,
    insights: true,
    recommendations: false
  });

  if (!applet.config?.ai_report) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Brain className="w-12 h-12 mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-700">No Report Available</h3>
        <p className="text-sm text-gray-500 mt-2">The AI insights report is being prepared.</p>
      </div>
    );
  }

  const report = applet.config.ai_report;

  const toggleSection = (section) => {
    if (!isViewOnly) return; // Only allow toggling in view mode
    setIsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">AI-Generated Insights</h2>
        <p className="text-gray-600 mt-2">Analysis based on all form responses</p>
        {applet.config.last_generated_at && (
          <p className="text-xs text-gray-500 mt-2">
            Generated on {new Date(applet.config.last_generated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Executive Summary */}
      {report.executiveSummary && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('summary')}
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Executive Summary
            </h3>
            {isViewOnly && (
              isExpanded.summary ?
                <ChevronUp className="w-5 h-5 text-gray-500" /> :
                <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {isExpanded.summary && (
            <p className="mt-4 text-gray-700 leading-relaxed">
              {report.executiveSummary}
            </p>
          )}
        </div>
      )}

      {/* Key Metrics */}
      {report.keyMetrics && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('metrics')}
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-blue-600" />
              Key Metrics
            </h3>
            {isViewOnly && (
              isExpanded.metrics ?
                <ChevronUp className="w-5 h-5 text-gray-500" /> :
                <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {isExpanded.metrics && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {report.keyMetrics.totalResponses !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-700">
                    {report.keyMetrics.totalResponses}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">Total Responses</p>
                </div>
              )}
              {report.keyMetrics.completionRate && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-700">
                    {report.keyMetrics.completionRate}
                  </p>
                  <p className="text-sm text-green-600 mt-1">Completion Rate</p>
                </div>
              )}
              {report.keyMetrics.averageTime && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-purple-700">
                    {report.keyMetrics.averageTime}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">Avg. Time</p>
                </div>
              )}
              {report.keyMetrics.satisfaction && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-yellow-700">
                    {report.keyMetrics.satisfaction}
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">Satisfaction</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Key Insights */}
      {report.insights && report.insights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('insights')}
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Key Insights
            </h3>
            {isViewOnly && (
              isExpanded.insights ?
                <ChevronUp className="w-5 h-5 text-gray-500" /> :
                <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {isExpanded.insights && (
            <ul className="mt-4 space-y-3">
              {report.insights.map((insight, index) => {
                // Handle both string and object formats
                const insightText = typeof insight === 'string'
                  ? insight
                  : insight.title || insight.description || JSON.stringify(insight);

                return (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{insightText}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('recommendations')}
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              Recommendations
            </h3>
            {isViewOnly && (
              isExpanded.recommendations ?
                <ChevronUp className="w-5 h-5 text-gray-500" /> :
                <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
          {isExpanded.recommendations && (
            <ul className="mt-4 space-y-3">
              {report.recommendations.map((rec, index) => {
                // Handle both string and object formats
                const recText = typeof rec === 'string'
                  ? rec
                  : rec.title || rec.description || JSON.stringify(rec);

                return (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{recText}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <div className="bg-gray-50 rounded-xl p-6 border-t-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Conclusion</h3>
          <p className="text-gray-700 leading-relaxed">
            {report.conclusion}
          </p>
        </div>
      )}
    </div>
  );
}