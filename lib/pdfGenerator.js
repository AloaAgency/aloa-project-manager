import jsPDF from 'jspdf';

export function generateAnalysisPDF(analysisData, formTitle) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addWrappedText = (text, fontSize = 12, fontStyle = 'normal', maxWidth = pageWidth - 2 * margin) => {
    doc.setFontSize(fontSize);
    doc.setFont(undefined, fontStyle);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach(line => {
      // Check if we need a new page
      if (yPosition + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    return yPosition;
  };

  // Add spacing
  const addSpacing = (space = 10) => {
    yPosition += space;
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Header with branding
  doc.setFillColor(0, 0, 0); // Black header
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 248, 232); // Cream text
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('AI Analysis Report', pageWidth / 2, 18, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPosition = 45;

  // Form title
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(formTitle, margin, yPosition);
  yPosition += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, margin, yPosition);
  doc.setTextColor(0, 0, 0);
  
  addSpacing(15);

  // Parse the analysis data
  if (analysisData.summary) {
    // Executive Summary
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Executive Summary', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    yPosition = addWrappedText(analysisData.summary, 11);
    addSpacing(15);
  }

  // Key Insights
  if (analysisData.insights && analysisData.insights.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Key Insights', margin, yPosition);
    yPosition += 8;
    
    analysisData.insights.forEach((insight, index) => {
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      
      // Add bullet point
      doc.text('•', margin + 5, yPosition);
      
      // Add insight text with indent
      const oldMargin = margin;
      doc.text('', margin + 12, yPosition);
      yPosition = addWrappedText(insight, 11, 'normal', pageWidth - margin - 12 - 20);
      addSpacing(5);
    });
    addSpacing(10);
  }

  // Trends and Patterns
  if (analysisData.trends && analysisData.trends.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Trends & Patterns', margin, yPosition);
    yPosition += 8;
    
    analysisData.trends.forEach((trend) => {
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text('•', margin + 5, yPosition);
      yPosition = addWrappedText(trend, 11, 'normal', pageWidth - margin - 12 - 20);
      addSpacing(5);
    });
    addSpacing(10);
  }

  // Recommendations
  if (analysisData.recommendations && analysisData.recommendations.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Recommendations', margin, yPosition);
    yPosition += 8;
    
    analysisData.recommendations.forEach((rec, index) => {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}.`, margin + 5, yPosition);
      yPosition = addWrappedText(rec, 11, 'normal', pageWidth - margin - 15 - 20);
      addSpacing(5);
    });
    addSpacing(10);
  }

  // Response Statistics
  if (analysisData.statistics) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Response Statistics', margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    if (analysisData.statistics.totalResponses !== undefined) {
      doc.text(`Total Responses: ${analysisData.statistics.totalResponses}`, margin + 5, yPosition);
      yPosition += 7;
    }
    
    if (analysisData.statistics.completionRate !== undefined) {
      doc.text(`Completion Rate: ${analysisData.statistics.completionRate}%`, margin + 5, yPosition);
      yPosition += 7;
    }
    
    if (analysisData.statistics.averageTime !== undefined) {
      doc.text(`Average Completion Time: ${analysisData.statistics.averageTime}`, margin + 5, yPosition);
      yPosition += 7;
    }
    
    addSpacing(10);
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by Aloa® Custom Forms', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

// Parse AI analysis text into structured data
export function parseAnalysisText(analysisText) {
  const data = {
    summary: '',
    insights: [],
    trends: [],
    recommendations: [],
    statistics: {}
  };

  if (!analysisText) return data;

  // Split by sections
  const sections = analysisText.split(/##\s+/);
  
  sections.forEach(section => {
    const lines = section.trim().split('\n');
    const sectionTitle = lines[0].toLowerCase();
    const content = lines.slice(1).join('\n').trim();
    
    if (sectionTitle.includes('summary') || sectionTitle.includes('overview')) {
      data.summary = content.replace(/^[-•*]\s*/gm, '').trim();
    } else if (sectionTitle.includes('insight') || sectionTitle.includes('finding')) {
      const insights = content.split(/^[-•*]\s+/m).filter(Boolean);
      data.insights = insights.map(i => i.trim());
    } else if (sectionTitle.includes('trend') || sectionTitle.includes('pattern')) {
      const trends = content.split(/^[-•*]\s+/m).filter(Boolean);
      data.trends = trends.map(t => t.trim());
    } else if (sectionTitle.includes('recommend') || sectionTitle.includes('suggestion')) {
      const recs = content.split(/^[\d.]+\s+/m).filter(Boolean);
      data.recommendations = recs.map(r => r.trim());
    } else if (sectionTitle.includes('statistic') || sectionTitle.includes('metric')) {
      // Parse statistics from content
      const statLines = content.split('\n');
      statLines.forEach(line => {
        if (line.includes('Total') && line.includes('Response')) {
          const match = line.match(/\d+/);
          if (match) data.statistics.totalResponses = parseInt(match[0]);
        }
        if (line.includes('Completion') && line.includes('Rate')) {
          const match = line.match(/(\d+(?:\.\d+)?)\s*%/);
          if (match) data.statistics.completionRate = parseFloat(match[1]);
        }
        if (line.includes('Average') && line.includes('Time')) {
          const match = line.match(/(\d+(?:\.\d+)?)\s*(minute|second|hour)/i);
          if (match) data.statistics.averageTime = `${match[1]} ${match[2]}s`;
        }
      });
    }
  });

  // If no structured data found, treat entire text as summary
  if (!data.summary && data.insights.length === 0 && data.trends.length === 0) {
    data.summary = analysisText;
  }

  return data;
}