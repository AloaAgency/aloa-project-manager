// Dynamic import for jsPDF to reduce bundle size
export async function generateAnalysisPDF(analysis, formTitle) {
  // Lazy load jsPDF only when generating PDFs
  const jsPDF = (await import('jspdf')).default;

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;
  
  // Color scheme matching the page
  const colors = {
    black: [0, 0, 0],
    gray: [107, 114, 128],
    lightGray: [229, 231, 235],
    purple: [147, 51, 234],
    pink: [236, 72, 153],
    green: [34, 197, 94],
    orange: [251, 146, 60],
    blue: [59, 130, 246],
    cream: [255, 248, 232]
  };

  // Helper functions
  const setColor = (color) => {
    doc.setTextColor(...color);
  };

  const drawLine = (y, color = colors.lightGray) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const addText = (text, x, y, options = {}) => {
    const defaultOptions = {
      fontSize: 11,
      fontStyle: 'normal',
      color: colors.black,
      align: 'left',
      maxWidth: contentWidth
    };
    const opts = { ...defaultOptions, ...options };
    
    doc.setFontSize(opts.fontSize);
    doc.setFont(undefined, opts.fontStyle);
    setColor(opts.color);
    
    if (opts.maxWidth && opts.align !== 'center') {
      const lines = doc.splitTextToSize(text, opts.maxWidth);
      lines.forEach((line, index) => {
        if (y + (index * 6) > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, x, y + (index * 6), { align: opts.align });
      });
      return y + (lines.length * 6);
    } else {
      doc.text(text, x, y, { align: opts.align });
      return y + 6;
    }
  };

  const addSection = (title, content, icon = null) => {
    // Check if we need a new page
    if (yPosition + 40 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    // Section box with subtle background
    const sectionHeight = 8;
    
    // Title with icon space
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    setColor(colors.black);
    doc.text(title.toUpperCase(), margin + (icon ? 10 : 0), yPosition + 6);
    
    yPosition += 12;
    return yPosition;
  };

  const addMetricCard = (label, value, x, y, width = 50) => {
    // Draw card border
    doc.setDrawColor(...colors.lightGray);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, 25, 'S');
    
    // Value
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    setColor(colors.black);
    doc.text(value, x + width/2, y + 12, { align: 'center' });
    
    // Label
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    setColor(colors.gray);
    doc.text(label.toUpperCase(), x + width/2, y + 20, { align: 'center' });
  };

  // === START PDF GENERATION ===
  
  // Header - Form Title
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  setColor(colors.black);
  const titleLines = doc.splitTextToSize(formTitle.toUpperCase(), contentWidth);
  titleLines.forEach((line, index) => {
    doc.text(line, pageWidth/2, yPosition + (index * 10), { align: 'center' });
  });
  yPosition += titleLines.length * 10 + 5;
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  setColor(colors.gray);
  doc.text(`Analysis based on ${analysis.totalResponses || 0} responses`, pageWidth/2, yPosition, { align: 'center' });
  yPosition += 8;
  
  // Date generated
  doc.setFontSize(9);
  setColor(colors.gray);
  doc.text(new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  }), pageWidth/2, yPosition, { align: 'center' });
  
  yPosition += 15;
  drawLine(yPosition);
  yPosition += 10;

  // Key Metrics Cards
  if (analysis.totalResponses || analysis.consensusScore || analysis.confidence) {
    const cardWidth = 50;
    const spacing = 5;
    const totalWidth = (cardWidth * 3) + (spacing * 2);
    const startX = (pageWidth - totalWidth) / 2;
    
    addMetricCard('Total Responses', String(analysis.totalResponses || 0), startX, yPosition, cardWidth);
    addMetricCard('Consensus Level', `${analysis.consensusScore || 0}%`, startX + cardWidth + spacing, yPosition, cardWidth);
    addMetricCard('Confidence', `${analysis.confidence || 0}%`, startX + (cardWidth + spacing) * 2, yPosition, cardWidth);
    
    yPosition += 35;
  }

  // Executive Summary
  if (analysis.executiveSummary) {
    yPosition = addSection('Executive Summary', analysis.executiveSummary);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    setColor(colors.gray);
    const summaryLines = doc.splitTextToSize(analysis.executiveSummary, contentWidth);
    summaryLines.forEach((line, index) => {
      if (yPosition + (index * 6) > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }

  // Areas of Agreement
  if (analysis.consensusAreas && analysis.consensusAreas.length > 0) {
    yPosition = addSection('Areas of Agreement');
    
    analysis.consensusAreas.forEach((area, index) => {
      // Check for page break
      if (yPosition + 30 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Area topic
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      setColor(colors.black);
      doc.text(`${area.topic.toUpperCase()}`, margin + 5, yPosition);
      yPosition += 6;
      
      // Description
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      setColor(colors.gray);
      const descLines = doc.splitTextToSize(area.description, contentWidth - 10);
      descLines.forEach(line => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      
      // Agreement percentage
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      setColor(colors.green);
      doc.text(`${area.agreementPercentage}% agreement`, margin + 5, yPosition);
      yPosition += 8;
    });
    yPosition += 5;
  }

  // Areas of Divergence
  if (analysis.conflictAreas && analysis.conflictAreas.length > 0) {
    yPosition = addSection('Areas of Divergence');
    
    analysis.conflictAreas.forEach((area, index) => {
      // Check for page break
      if (yPosition + 40 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Area topic
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      setColor(colors.black);
      doc.text(`${area.topic.toUpperCase()}`, margin + 5, yPosition);
      yPosition += 7;
      
      // Viewpoints
      if (area.viewpoints && area.viewpoints.length > 0) {
        area.viewpoints.forEach(viewpoint => {
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          
          // Percentage
          doc.setFont(undefined, 'bold');
          setColor(colors.orange);
          doc.text(`${viewpoint.percentage}%:`, margin + 10, yPosition);
          
          // Description
          doc.setFont(undefined, 'normal');
          setColor(colors.gray);
          const vpLines = doc.splitTextToSize(viewpoint.description, contentWidth - 25);
          vpLines.forEach((line, i) => {
            doc.text(line, margin + 25, yPosition + (i * 5));
          });
          yPosition += vpLines.length * 5 + 3;
        });
      }
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Actionable Recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    yPosition = addSection('Actionable Recommendations');
    
    analysis.recommendations.forEach((rec, index) => {
      // Check for page break
      if (yPosition + 30 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Number circle
      doc.setFillColor(...colors.blue);
      doc.circle(margin + 6, yPosition - 2, 3, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      setColor(colors.cream);
      doc.text(String(index + 1), margin + 6, yPosition, { align: 'center' });
      
      // Title
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      setColor(colors.black);
      doc.text(rec.title.toUpperCase(), margin + 15, yPosition);
      yPosition += 6;
      
      // Description
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      setColor(colors.gray);
      const recLines = doc.splitTextToSize(rec.description, contentWidth - 20);
      recLines.forEach(line => {
        doc.text(line, margin + 15, yPosition);
        yPosition += 5;
      });
      
      // Priority if exists
      if (rec.priority) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        const priorityColor = rec.priority === 'high' ? colors.orange : 
                            rec.priority === 'medium' ? [251, 191, 36] : colors.green;
        setColor(priorityColor);
        doc.text(`${rec.priority.toUpperCase()} PRIORITY`, margin + 15, yPosition);
        yPosition += 5;
      }
      
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Message to Stakeholders
  if (analysis.stakeholderMessage) {
    yPosition = addSection('Message to Stakeholders');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'italic');
    setColor(colors.gray);
    const messageLines = doc.splitTextToSize(`"${analysis.stakeholderMessage}"`, contentWidth - 10);
    messageLines.forEach(line => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin + 5, yPosition);
      yPosition += 6;
    });
  }

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer line
    drawLine(pageHeight - 20);
    
    // Footer text
    doc.setFontSize(8);
    setColor(colors.gray);
    doc.text('Generated by Custom Forms', margin, pageHeight - 12);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }

  return doc;
}

// Simpler parse function since we're getting the full analysis object
export function parseAnalysisText(analysisText) {
  // If it's already an object, return it
  if (typeof analysisText === 'object' && analysisText !== null) {
    return analysisText;
  }
  
  // Try to parse JSON
  try {
    return JSON.parse(analysisText);
  } catch (e) {
    // Return a basic structure if parsing fails
    return {
      executiveSummary: analysisText,
      consensusAreas: [],
      conflictAreas: [],
      recommendations: [],
      totalResponses: 0,
      consensusScore: 0,
      confidence: 0
    };
  }
}