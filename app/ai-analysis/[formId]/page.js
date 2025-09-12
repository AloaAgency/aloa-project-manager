'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Brain, Users, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Sparkles, RefreshCw, Download, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/LoadingSpinner';
import AuthGuard from '@/components/AuthGuard';
import toast from 'react-hot-toast';

function AIAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    recipientName: '',
    ccEmails: '',
    customSubject: '',
    isClientFacing: true
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, [params.formId]);

  const fetchFormData = async () => {
    try {
      const response = await fetch(`/api/aloa-forms/${params.formId}`);
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

  const downloadPDF = async () => {
    if (!analysis || !form) return;
    
    // Use browser's print dialog for exact page replica
    // Add a class to hide elements we don't want in the PDF
    document.body.classList.add('printing-pdf');
    
    // Trigger print dialog
    window.print();
    
    // Remove the class after a short delay
    setTimeout(() => {
      document.body.classList.remove('printing-pdf');
    }, 100);
    
    toast.success('Opening print dialog - save as PDF for best results');
  };

  const generatePreview = async () => {
    try {
      const { generateEmailPreview, parseAnalysisText } = await import('@/lib/emailTemplates');
      
      // For client-facing emails, format the text with the detailed sections
      const analysisText = formatAnalysisAsText(analysis, emailForm.isClientFacing);
      
      // Parse the analysis object directly for better structure
      const parsedData = {
        summary: analysis.executiveSummary || '',
        consensusAreas: analysis.consensusAreas || [],
        divergenceAreas: analysis.conflictAreas ? analysis.conflictAreas.map(area => ({
          topic: area.topic,
          viewpoints: area.viewpoints ? area.viewpoints.map(vp => ({
            label: vp.percentage > 50 ? 'Majority view' : vp.percentage > 30 ? 'Significant perspective' : 'Alternative approach',
            percentage: vp.percentage,
            description: vp.description
          })) : []
        })) : [],
        synthesis: analysisText.includes('## Synthesis') ? 
          analysisText.split('## Synthesis')[1].split('##')[0].trim() : '',
        recommendations: !emailForm.isClientFacing && analysis.recommendations ? 
          analysis.recommendations.map(r => `${r.title}: ${r.description}`) : [],
        statistics: {
          totalResponses: analysis.totalResponses || 0,
          consensusScore: analysis.consensusScore || 0,
          completionRate: analysis.completionRate,
          averageTime: analysis.averageTime
        }
      };
      
      // Generate preview with parsed data
      const preview = {
        html: generateAnalysisEmailHTML(form.title, parsedData, emailForm.recipientName, emailForm.isClientFacing),
        preview: {
          subject: emailForm.customSubject || (emailForm.isClientFacing ? `Your Input Summary: ${form.title}` : `AI Analysis Report: ${form.title}`),
          greeting: emailForm.recipientName ? `Dear ${emailForm.recipientName},` : 'Hello,',
          isClientFacing: emailForm.isClientFacing,
          sections: []
        }
      };
      
      setEmailPreview(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    }
  };
  
  // Import the email template function at the top
  const generateAnalysisEmailHTML = (formTitle, parsedData, recipientName, isClientFacing) => {
    if (typeof window !== 'undefined') {
      const { generateAnalysisEmailHTML: genEmail } = require('@/lib/emailTemplates');
      return genEmail(formTitle, parsedData, recipientName, isClientFacing);
    }
    return '';
  };

  const sendAnalysisEmail = async () => {
    if (!emailForm.recipientEmail) {
      toast.error('Please enter a recipient email');
      return;
    }
    
    setSendingEmail(true);
    try {
      // Create properly structured data for the email
      const emailData = {
        summary: analysis.executiveSummary || '',
        consensusAreas: analysis.consensusAreas || [],
        divergenceAreas: analysis.conflictAreas ? analysis.conflictAreas.map(area => ({
          topic: area.topic,
          viewpoints: area.viewpoints ? area.viewpoints.map(vp => ({
            label: vp.percentage > 50 ? 'Majority view' : vp.percentage > 30 ? 'Significant perspective' : 'Alternative approach',
            percentage: vp.percentage,
            description: vp.description
          })) : []
        })) : [],
        synthesis: emailForm.isClientFacing ? formatSynthesisText(analysis) : '',
        recommendations: !emailForm.isClientFacing && analysis.recommendations ? 
          analysis.recommendations.map(r => `${r.title}: ${r.description}`) : [],
        statistics: {
          totalResponses: analysis.totalResponses || 0,
          consensusScore: analysis.consensusScore || 0
        }
      };
      
      // Convert to text format that includes all sections
      const analysisText = JSON.stringify(emailData);
      
      const response = await fetch(`/api/ai-analysis/${params.formId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: emailForm.recipientEmail,
          recipientName: emailForm.recipientName,
          analysisText,
          formTitle: form.title,
          ccEmails: emailForm.ccEmails ? emailForm.ccEmails.split(',').map(e => e.trim()).filter(Boolean) : [],
          customSubject: emailForm.customSubject || (emailForm.isClientFacing ? `Your Input Summary: ${form.title}` : `AI Analysis Report: ${form.title}`),
          isClientFacing: emailForm.isClientFacing
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }
      
      toast.success('Analysis email sent successfully!');
      setShowEmailModal(false);
      setEmailForm({
        recipientEmail: '',
        recipientName: '',
        ccEmails: '',
        customSubject: '',
        isClientFacing: true
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatSynthesisText = (analysisData) => {
    let text = '';
    
    // Build on Strong Foundations
    if (analysisData.consensusAreas && analysisData.consensusAreas.length > 0) {
      const topConsensus = analysisData.consensusAreas[0];
      text += `**Build on Strong Foundations:** Your team's ${topConsensus.agreementPercentage || 'strong'}% agreement on ${topConsensus.topic.toLowerCase()} provides a solid foundation. This should be your north star as you move forward.\n\n`;
    }
    
    // Embrace Diverse Perspectives
    if (analysisData.conflictAreas && analysisData.conflictAreas.length > 0) {
      text += `**Embrace Diverse Perspectives:** The varying viewpoints aren't obstacles but rather indicators of a thoughtful team considering multiple angles. `;
      
      // Check for split patterns
      const hasHighDivergence = analysisData.conflictAreas.some(area => 
        area.viewpoints && area.viewpoints.some(vp => vp.percentage > 40 && vp.percentage < 60)
      );
      
      if (hasHighDivergence) {
        text += `With relatively even splits on certain topics, consider pilot programs or A/B testing to validate different approaches.`;
      } else {
        text += `With clear majority/minority splits, consider implementing the majority view while creating specific accommodations for minority concerns.`;
      }
      text += `\n\n`;
    }
    
    // Immediate Next Steps
    text += `**Immediate Next Steps:**\n`;
    text += `1. Focus first on areas with ${analysisData.consensusScore || 80}% or higher agreement to build momentum\n`;
    text += `2. Create working groups for areas with divergent views to develop integrated solutions\n`;
    text += `3. Establish success metrics that reflect both consensus priorities and diverse perspectives\n\n`;
    
    // Key Insight
    const consensusScore = analysisData.consensusScore || 0;
    text += `**Key Insight:** Your team shows ${consensusScore}% overall alignment, which is `;
    text += consensusScore > 70 ? 'exceptionally strong' : consensusScore > 50 ? 'healthy' : 'an opportunity for further dialogue';
    text += `. The areas of difference are well-defined and manageable, suggesting a team that's thoughtfully engaged with the challenges at hand.`;
    
    return text;
  };
  
  const formatAnalysisAsText = (analysisData, isClientFacing = false) => {
    let text = '';
    
    if (analysisData.executiveSummary) {
      text += `## Executive Summary\n${analysisData.executiveSummary}\n\n`;
    }
    
    // For client-facing emails, provide detailed consensus analysis
    if (isClientFacing) {
      // Strong Agreement Areas
      if (analysisData.consensusAreas && analysisData.consensusAreas.length > 0) {
        text += `## Where Your Team Strongly Agrees\n\n`;
        analysisData.consensusAreas.forEach(area => {
          text += `### ${area.topic}\n`;
          text += `${area.description}\n`;
          text += `*${area.agreementPercentage}% of participants share this view*\n\n`;
          
          // Add specific insights if available
          if (area.description.length > 50) {
            text += `This consensus suggests that ${area.topic.toLowerCase()} is a critical priority that should anchor your strategy moving forward.\n\n`;
          }
        });
      }
      
      // Areas of Different Perspectives
      if (analysisData.conflictAreas && analysisData.conflictAreas.length > 0) {
        text += `## Where Perspectives Differ\n\n`;
        text += `These differences aren't roadblocks—they're opportunities to create a more comprehensive solution that addresses diverse needs:\n\n`;
        
        analysisData.conflictAreas.forEach(area => {
          text += `### ${area.topic}\n\n`;
          
          // Present viewpoints as equally valid perspectives
          text += `Your team has identified multiple valid approaches:\n\n`;
          area.viewpoints.forEach((vp, index) => {
            const perspective = index === 0 ? 'One perspective' : index === 1 ? 'Another view' : 'An additional approach';
            text += `**${perspective} (${vp.percentage}% of team):** ${vp.description}\n\n`;
          });
          
          // Add synthesis for this specific divergence
          text += `*Synthesis:* These different viewpoints on ${area.topic.toLowerCase()} suggest an opportunity to implement a hybrid approach that leverages the strengths of each perspective.\n\n`;
        });
      }
      
      // Detailed Path Forward
      text += `## Synthesis & Recommended Path Forward\n\n`;
      
      // Start with specifics based on the actual data
      if (analysisData.consensusAreas && analysisData.consensusAreas.length > 0) {
        const topConsensus = analysisData.consensusAreas[0];
        text += `**Build on Strong Foundations:** Your team's ${topConsensus.agreementPercentage}% agreement on ${topConsensus.topic.toLowerCase()} provides a solid foundation. This should be your north star as you move forward.\n\n`;
      }
      
      if (analysisData.conflictAreas && analysisData.conflictAreas.length > 0) {
        text += `**Embrace Diverse Perspectives:** The varying viewpoints aren't obstacles but rather indicators of a thoughtful team considering multiple angles. `;
        
        // Provide specific guidance based on the divergence patterns
        const hasHighDivergence = analysisData.conflictAreas.some(area => 
          area.viewpoints.some(vp => vp.percentage > 40 && vp.percentage < 60)
        );
        
        if (hasHighDivergence) {
          text += `With relatively even splits on certain topics, consider pilot programs or A/B testing to validate different approaches.\n\n`;
        } else {
          text += `With clear majority/minority splits, consider implementing the majority view while creating specific accommodations for minority concerns.\n\n`;
        }
      }
      
      // Action-oriented next steps
      text += `**Immediate Next Steps:**\n`;
      text += `1. Focus first on areas with ${analysisData.consensusScore}% or higher agreement to build momentum\n`;
      text += `2. Create working groups for areas with divergent views to develop integrated solutions\n`;
      text += `3. Establish success metrics that reflect both consensus priorities and diverse perspectives\n\n`;
      
      // Closing insight
      text += `**Key Insight:** Your team shows ${analysisData.consensusScore}% overall alignment, which is ${analysisData.consensusScore > 70 ? 'exceptionally strong' : analysisData.consensusScore > 50 ? 'healthy' : 'an opportunity for further dialogue'}. `;
      text += `The areas of difference are well-defined and manageable, suggesting a team that's thoughtfully engaged with the challenges at hand.\n\n`;
      
    } else {
      // Internal format - keep existing structure
      if (analysisData.consensusAreas && analysisData.consensusAreas.length > 0) {
        text += `## Key Insights\n`;
        analysisData.consensusAreas.forEach(area => {
          text += `- ${area.topic}: ${area.description} (${area.agreementPercentage}% agreement)\n`;
        });
        text += '\n';
      }
      
      if (analysisData.conflictAreas && analysisData.conflictAreas.length > 0) {
        text += `## Areas of Divergence\n`;
        analysisData.conflictAreas.forEach(area => {
          text += `- ${area.topic}:\n`;
          area.viewpoints.forEach(vp => {
            text += `  - ${vp.percentage}%: ${vp.description}\n`;
          });
        });
        text += '\n';
      }
      
      if (analysisData.recommendations && analysisData.recommendations.length > 0) {
        text += `## Recommendations\n`;
        analysisData.recommendations.forEach((rec, index) => {
          text += `${index + 1}. ${rec.title}: ${rec.description}`;
          if (rec.priority) text += ` (${rec.priority} priority)`;
          text += '\n';
        });
        text += '\n';
      }
    }
    
    text += `## Response Statistics\n`;
    text += `Total Responses: ${analysisData.totalResponses}\n`;
    text += `Consensus Level: ${analysisData.consensusScore}%\n`;
    text += `Confidence Score: ${analysisData.confidence}%\n`;
    
    return text;
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
            className="mb-6 inline-flex items-center gap-2 text-aloa-black hover:text-aloa-gray transition-colors font-display uppercase tracking-wider text-xs sm:text-sm group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="text-center mb-8">
            {/* Form Title as Main Header */}
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-aloa-black uppercase tracking-tight mb-2">
              {form.title}
            </h1>
            
            {/* Subtitle with Response Count */}
            <p className="text-lg text-aloa-gray font-body">
              Analysis based on {analysis ? analysis.totalResponses : '...'} responses
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-display uppercase tracking-wider text-aloa-gray">
                AI-Powered Insights
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {analysis && (
                <>
                  <button
                    onClick={downloadPDF}
                    className="px-6 py-3 bg-transparent text-aloa-black border-2 border-aloa-black font-display uppercase tracking-wider hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="px-6 py-3 bg-transparent text-aloa-black border-2 border-aloa-black font-display uppercase tracking-wider hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-aloa-cream flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Send</span>
                  </button>
                </>
              )}
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-display uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-aloa-cream disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{analysis ? 'Re-analyze' : 'Start Analysis'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {!analysis && !analyzing && (
          <div className="bg-aloa-white p-12 sm:p-16 border-2 border-aloa-black shadow-xl text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-8 mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300 flex items-center justify-center">
                <Brain className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-aloa-black mb-4 uppercase">
                Ready to Analyze
              </h2>
              <p className="text-aloa-gray mb-10 font-body text-sm sm:text-base leading-relaxed">
                Generate AI-powered insights from your collected responses. 
                The AI will identify areas of consensus, divergence, and provide actionable synthesis.
              </p>
              <button
                onClick={runAnalysis}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-display uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-aloa-cream inline-flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Start Analysis</span>
              </button>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="bg-aloa-white p-12 sm:p-16 border-2 border-aloa-black shadow-xl text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse"></div>
                  <div className="absolute inset-3 bg-white flex items-center justify-center">
                    <Brain className="w-10 h-10 text-purple-600 animate-pulse" />
                  </div>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-aloa-black mb-3 uppercase">
                Analyzing Responses...
              </h2>
              <p className="text-aloa-gray font-body text-sm sm:text-base">
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
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 sm:p-8 border-2 border-purple-400 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-600 rounded">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-aloa-black uppercase mb-4">
                    Executive Summary
                  </h2>
                  <p className="text-aloa-gray font-body leading-relaxed text-sm sm:text-base">
                    {analysis.executiveSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-aloa-white p-6 sm:p-8 border-2 border-aloa-black shadow-lg hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1">
                <Users className="w-10 h-10 text-blue-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <p className="text-3xl font-display font-bold text-aloa-black mb-1">
                  {analysis.totalResponses}
                </p>
                <p className="text-xs sm:text-sm font-display uppercase tracking-wider text-aloa-gray">
                  Total Responses
                </p>
              </div>
              <div className="bg-aloa-white p-6 sm:p-8 border-2 border-aloa-black shadow-lg hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1">
                <TrendingUp className="w-10 h-10 text-green-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <p className="text-3xl font-display font-bold text-aloa-black mb-1">
                  {analysis.consensusScore}%
                </p>
                <p className="text-xs sm:text-sm font-display uppercase tracking-wider text-aloa-gray">
                  Consensus Level
                </p>
              </div>
              <div className="bg-aloa-white p-6 sm:p-8 border-2 border-aloa-black shadow-lg hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1">
                <Brain className="w-10 h-10 text-purple-500 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <p className="text-3xl font-display font-bold text-aloa-black mb-1">
                  {analysis.confidence}%
                </p>
                <p className="text-xs sm:text-sm font-display uppercase tracking-wider text-aloa-gray">
                  Confidence Score
                </p>
              </div>
            </div>

            {/* Consensus Areas */}
            {analysis.consensusAreas && analysis.consensusAreas.length > 0 && (
              <div className="bg-aloa-white p-6 sm:p-8 border-2 border-aloa-black shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-500 rounded">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-aloa-black uppercase">
                    Areas of Agreement
                  </h2>
                </div>
                <div className="space-y-4">
                  {analysis.consensusAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 bg-green-50 border-2 border-green-300 hover:border-green-400 transition-all duration-200 hover:shadow-md"
                    >
                      <ArrowRight className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-aloa-black uppercase text-sm sm:text-base mb-2">
                          {area.topic}
                        </h3>
                        <p className="text-aloa-gray font-body text-sm sm:text-base leading-relaxed mb-2">
                          {area.description}
                        </p>
                        <span className="inline-block text-xs font-display uppercase tracking-wider text-green-600 bg-green-100 px-2 py-1">
                          {area.agreementPercentage}% agreement
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Conflict Areas */}
            {analysis.conflictAreas && analysis.conflictAreas.length > 0 && (
              <div className="bg-aloa-white p-6 sm:p-8 border-2 border-aloa-black shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-500 rounded">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-aloa-black uppercase">
                    Areas of Divergence
                  </h2>
                </div>
                <div className="space-y-4">
                  {analysis.conflictAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-orange-50 border-2 border-orange-300 hover:border-orange-400 transition-all duration-200 hover:shadow-md"
                    >
                      <h3 className="font-display font-bold text-aloa-black uppercase text-sm sm:text-base mb-3">
                        {area.topic}
                      </h3>
                      <div className="space-y-3">
                        {area.viewpoints.map((viewpoint, vIndex) => (
                          <div key={vIndex} className="pl-4 border-l-3 border-orange-400">
                            <div className="flex items-start gap-2">
                              <span className="inline-block text-xs font-display uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-1">
                                {viewpoint.percentage}%
                              </span>
                              <p className="text-sm sm:text-base text-aloa-gray font-body leading-relaxed flex-1">
                                {viewpoint.description}
                              </p>
                            </div>
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
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 sm:p-8 border-2 border-blue-400 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-600 rounded">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-aloa-black uppercase">
                    Actionable Recommendations
                  </h2>
                </div>
                <div className="space-y-4">
                  {analysis.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white flex items-center justify-center font-display font-bold text-base">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-aloa-black uppercase text-sm sm:text-base mb-2">
                          {rec.title}
                        </h3>
                        <p className="text-aloa-gray font-body text-sm sm:text-base leading-relaxed mb-2">
                          {rec.description}
                        </p>
                        {rec.priority && (
                          <span className={`inline-block px-3 py-1 text-xs font-display uppercase tracking-wider ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-300' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                            'bg-green-100 text-green-700 border border-green-300'
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
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-8 border-2 border-indigo-400 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-indigo-600 rounded">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-aloa-black uppercase mb-4">
                      Message to Stakeholders
                    </h2>
                    <p className="text-aloa-gray font-body leading-relaxed italic text-sm sm:text-base">
                      "{analysis.stakeholderMessage}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-aloa-white border-2 border-aloa-black shadow-2xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between sticky top-0 bg-aloa-white p-8 pb-4 border-b-2 border-aloa-black z-10">
                <h3 className="text-xl font-display font-bold text-aloa-black uppercase">
                  Send Analysis Report
                </h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-aloa-gray hover:text-aloa-black hover:bg-aloa-sand transition-all duration-200 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2 px-8 pb-8">
                {/* Email Type Toggle */}
                <div className="mb-6">
                  <label className="block text-sm font-display uppercase tracking-wider text-aloa-gray mb-3">
                    Email Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailForm({...emailForm, isClientFacing: true})}
                      className={`flex-1 px-4 py-3 text-sm font-display uppercase tracking-wider transition-all duration-200 ${
                        emailForm.isClientFacing
                          ? 'bg-aloa-black text-aloa-cream shadow-md'
                          : 'bg-aloa-white text-aloa-gray border-2 border-aloa-black hover:bg-aloa-sand'
                      }`}
                    >
                      Client-Facing
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailForm({...emailForm, isClientFacing: false})}
                      className={`flex-1 px-4 py-3 text-sm font-display uppercase tracking-wider transition-all duration-200 ${
                        !emailForm.isClientFacing
                          ? 'bg-aloa-black text-aloa-cream shadow-md'
                          : 'bg-aloa-white text-aloa-gray border-2 border-aloa-black hover:bg-aloa-sand'
                      }`}
                    >
                      Internal
                    </button>
                  </div>
                </div>
                
                <div className="mb-5">
                  <label className="block text-sm font-display uppercase tracking-wider text-aloa-gray mb-2">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    value={emailForm.recipientEmail}
                    onChange={(e) => setEmailForm({...emailForm, recipientEmail: e.target.value})}
                    className="w-full px-4 py-3 bg-aloa-white border-2 border-aloa-black focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 hover:shadow-md placeholder:text-aloa-gray"
                    placeholder="recipient@example.com"
                    required
                  />
                </div>
                
                <div className="mb-5">
                  <label className="block text-sm font-display uppercase tracking-wider text-aloa-gray mb-2">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={emailForm.recipientName}
                    onChange={(e) => setEmailForm({...emailForm, recipientName: e.target.value})}
                    className="w-full px-4 py-3 bg-aloa-white border-2 border-aloa-black focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 hover:shadow-md placeholder:text-aloa-gray"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="mb-5">
                  <label className="block text-sm font-display uppercase tracking-wider text-aloa-gray mb-2">
                    CC Emails (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={emailForm.ccEmails}
                    onChange={(e) => setEmailForm({...emailForm, ccEmails: e.target.value})}
                    className="w-full px-4 py-3 bg-aloa-white border-2 border-aloa-black focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 hover:shadow-md placeholder:text-aloa-gray"
                    placeholder="cc1@example.com, cc2@example.com"
                  />
                </div>
                
                <div className="mb-5">
                  <label className="block text-sm font-display uppercase tracking-wider text-aloa-gray mb-2">
                    Custom Subject (optional)
                  </label>
                  <input
                    type="text"
                    value={emailForm.customSubject}
                    onChange={(e) => setEmailForm({...emailForm, customSubject: e.target.value})}
                    className="w-full px-4 py-3 bg-aloa-white border-2 border-aloa-black focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 hover:shadow-md placeholder:text-aloa-gray"
                    placeholder={emailForm.isClientFacing ? `Your Input Summary: ${form?.title || 'Form'}` : `AI Analysis Report: ${form?.title || 'Form'}`}
                  />
                </div>
              </div>
              
              {/* Preview Section */}
              {showPreview && emailPreview && (
                <div className="mx-8 mt-6 p-4 bg-aloa-sand border-2 border-aloa-black">
                  <h4 className="text-sm font-display uppercase tracking-wider text-aloa-black mb-2">
                    Email Preview
                  </h4>
                  <div className="text-xs text-aloa-gray space-y-1 mb-3 font-body">
                    <p className="flex justify-between">
                      <span className="font-display uppercase tracking-wider">Subject:</span>
                      <span className="text-aloa-black truncate ml-2">{emailPreview.preview.subject}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-display uppercase tracking-wider">Type:</span>
                      <span className="text-aloa-black">{emailPreview.preview.isClientFacing ? 'Client-Facing' : 'Internal'}</span>
                    </p>
                  </div>
                  <div className="bg-aloa-white border-2 border-aloa-black" style={{ height: '250px', overflow: 'hidden', position: 'relative' }}>
                    <iframe
                      srcDoc={emailPreview.html}
                      style={{
                        width: '200%',
                        height: '500px',
                        border: 'none',
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-8 px-8 pb-12">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setShowPreview(false);
                    setEmailPreview(null);
                  }}
                  className="flex-1 px-4 py-3 bg-transparent text-aloa-black border-2 border-aloa-black font-display uppercase tracking-wider hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                {!showPreview ? (
                  <button
                    onClick={generatePreview}
                    className="flex-1 px-4 py-3 bg-transparent text-aloa-black border-2 border-aloa-black font-display uppercase tracking-wider hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!emailForm.recipientEmail}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Preview
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setEmailPreview(null);
                    }}
                    className="flex-1 px-4 py-3 bg-transparent text-aloa-black border-2 border-aloa-black font-display uppercase tracking-wider hover:bg-aloa-black hover:text-aloa-cream transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={sendAnalysisEmail}
                  className="flex-1 px-4 py-3 bg-aloa-black text-aloa-cream font-display uppercase tracking-wider hover:bg-opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={sendingEmail || !emailForm.recipientEmail}
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAnalysisPageWrapper() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <AIAnalysisPage />
    </AuthGuard>
  );
}