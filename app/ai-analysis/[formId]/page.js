'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Brain, Users, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AIAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, [params.formId]);

  const fetchFormData = async () => {
    try {
      const response = await fetch(`/api/forms/by-id/${params.formId}`);
      if (!response.ok) throw new Error('Failed to fetch form');
      
      const formData = await response.json();
      setForm(formData);
      
      // Check if we have cached analysis
      const analysisRes = await fetch(`/api/ai-analysis/${params.formId}`);
      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        if (analysisData.analysis) {
          setAnalysis(analysisData.analysis);
        }
      }
    } catch (error) {
      console.error('Error fetching form:', error);
      toast.error('Failed to load form data');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/ai-analysis/${params.formId}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setAnalysis(data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error running analysis:', error);
      toast.error('Failed to analyze responses');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner message="Loading form data..." />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-sm"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-aloa-black uppercase tracking-tight">
                  AI Analysis
                </h1>
              </div>
              <p className="text-aloa-gray font-body">{form.title}</p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="btn-primary flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {analysis ? 'Re-analyze' : 'Start Analysis'}
                </>
              )}
            </button>
          </div>
        </div>

        {!analysis && !analyzing && (
          <div className="card text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mb-6 mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-aloa-black mb-4 uppercase">
                Ready to Analyze
              </h2>
              <p className="text-aloa-gray mb-8 font-body">
                Click "Start Analysis" to generate AI-powered insights from your form responses. 
                The AI will identify consensus, conflicts, and provide actionable recommendations.
              </p>
              <button
                onClick={runAnalysis}
                className="btn-primary mx-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Analysis
              </button>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="card text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <Brain className="w-8 h-8 text-purple-600 animate-pulse" />
                  </div>
                </div>
              </div>
              <h2 className="text-xl font-display font-bold text-aloa-black mb-2 uppercase">
                Analyzing Responses...
              </h2>
              <p className="text-aloa-gray font-body">
                Our AI is processing all responses to identify patterns and insights
              </p>
            </div>
          </div>
        )}

        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Executive Summary */}
            <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-display font-bold text-aloa-black uppercase mb-3">
                    Executive Summary
                  </h2>
                  <p className="text-aloa-gray font-body leading-relaxed">
                    {analysis.executiveSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-display font-bold text-aloa-black">
                  {analysis.totalResponses}
                </p>
                <p className="text-sm font-display uppercase tracking-wider text-aloa-gray">
                  Total Responses
                </p>
              </div>
              <div className="card text-center">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-display font-bold text-aloa-black">
                  {analysis.consensusScore}%
                </p>
                <p className="text-sm font-display uppercase tracking-wider text-aloa-gray">
                  Consensus Level
                </p>
              </div>
              <div className="card text-center">
                <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-display font-bold text-aloa-black">
                  {analysis.confidence}%
                </p>
                <p className="text-sm font-display uppercase tracking-wider text-aloa-gray">
                  Confidence Score
                </p>
              </div>
            </div>

            {/* Consensus Areas */}
            {analysis.consensusAreas && analysis.consensusAreas.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-xl font-display font-bold text-aloa-black uppercase">
                    Areas of Agreement
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.consensusAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <ArrowRight className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-display font-semibold text-aloa-black uppercase text-sm mb-1">
                          {area.topic}
                        </p>
                        <p className="text-aloa-gray font-body text-sm">
                          {area.description}
                        </p>
                        <p className="text-xs text-green-600 mt-1 font-display uppercase">
                          {area.agreementPercentage}% agreement
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflict Areas */}
            {analysis.conflictAreas && analysis.conflictAreas.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                  <h2 className="text-xl font-display font-bold text-aloa-black uppercase">
                    Areas of Divergence
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.conflictAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <p className="font-display font-semibold text-aloa-black uppercase text-sm mb-2">
                        {area.topic}
                      </p>
                      <div className="space-y-2">
                        {area.viewpoints.map((viewpoint, vIndex) => (
                          <div key={vIndex} className="pl-4 border-l-2 border-orange-300">
                            <p className="text-sm text-aloa-gray font-body">
                              <span className="font-semibold">{viewpoint.percentage}%:</span> {viewpoint.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-display font-bold text-aloa-black uppercase">
                    Actionable Recommendations
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-display font-bold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-display font-semibold text-aloa-black uppercase text-sm mb-1">
                          {rec.title}
                        </p>
                        <p className="text-aloa-gray font-body text-sm">
                          {rec.description}
                        </p>
                        {rec.priority && (
                          <span className={`inline-block mt-2 px-2 py-1 text-xs font-display uppercase tracking-wider rounded ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {rec.priority} priority
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Stakeholder Message */}
            {analysis.stakeholderMessage && (
              <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-xl font-display font-bold text-aloa-black uppercase mb-3">
                      Message to Stakeholders
                    </h2>
                    <p className="text-aloa-gray font-body leading-relaxed italic">
                      "{analysis.stakeholderMessage}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}