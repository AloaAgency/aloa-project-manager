export function generateAnalysisEmailHTML(formTitle, analysisData, recipientName = '', isClientFacing = true) {
  const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
  
  // Handle both string and object formats
  let parsed;
  if (typeof analysisData === 'object' && analysisData !== null) {
    // Already parsed/structured data
    parsed = analysisData;
  } else if (typeof analysisData === 'string') {
    // Try to parse as JSON first
    try {
      if (analysisData.startsWith('{')) {
        parsed = JSON.parse(analysisData);
      } else {
        // Parse markdown-style text
        parsed = parseAnalysisForEmail(analysisData);
      }
    } catch (e) {
      // Fallback to text parsing
      parsed = parseAnalysisForEmail(analysisData);
    }
  } else {
    // Fallback to empty structure
    parsed = {
      summary: '',
      consensusAreas: [],
      divergenceAreas: [],
      recommendations: [],
      synthesis: '',
      statistics: {}
    };
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Analysis Report - ${formTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <!-- Aloa Logo -->
              <img src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" 
                   alt="Aloa" 
                   style="height: 40px; width: auto; margin: 0 auto 20px auto; display: block;"
              />
              <!-- Form Title -->
              <h1 style="margin: 0 0 10px 0; color: #FFF8E8; font-size: 28px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ${formTitle}
              </h1>
              <!-- Subtitle -->
              <p style="margin: 0; color: #FFF8E8; font-size: 16px; opacity: 0.9;">
                Analysis based on ${parsed.statistics && parsed.statistics.totalResponses ? parsed.statistics.totalResponses : 'all'} responses
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                ${greeting}
              </p>
              
              <!-- Introduction -->
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                ${isClientFacing ? 
                  `Thank you for participating in <strong>${formTitle}</strong>. We've analyzed all responses and are pleased to share the collective insights from all participants. This summary highlights where there's consensus and where perspectives differ.` :
                  `We're pleased to share the AI-powered analysis of the responses collected through <strong>${formTitle}</strong>. This report provides valuable insights and recommendations based on the submitted data.`
                }
              </p>
              
              ${parsed.summary ? `
              <!-- Executive Summary -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #FFF8E8; border-left: 4px solid #000000; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Executive Summary</h2>
                <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                  ${parsed.summary}
                </p>
              </div>
              ` : ''}
              
              ${isClientFacing && parsed.consensusAreas && parsed.consensusAreas.length > 0 ? `
              <!-- Where Your Team Agrees -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 600;">Where Your Team Strongly Agrees</h2>
                ${parsed.consensusAreas.map(area => `
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 16px; font-weight: 600;">${area.topic}</h3>
                    <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                      ${area.description}
                    </p>
                  </div>
                `).join('')}
              </div>
              ` : ''}
              
              ${isClientFacing && parsed.divergenceAreas && parsed.divergenceAreas.length > 0 ? `
              <!-- Where Perspectives Differ -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #000000; font-size: 18px; font-weight: 600;">Where Perspectives Differ</h2>
                <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; font-style: italic;">
                  These differences represent opportunities to create more comprehensive solutions:
                </p>
                ${parsed.divergenceAreas.map(area => `
                  <div style="margin-bottom: 20px; padding: 15px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
                    <h3 style="margin: 0 0 12px 0; color: #e65100; font-size: 16px; font-weight: 600;">${area.topic}</h3>
                    ${area.viewpoints && area.viewpoints.map(vp => `
                      <div style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 4px;">
                        <strong style="color: #333333; font-size: 13px;">${vp.label} (${vp.percentage}% of team):</strong>
                        <p style="margin: 5px 0 0 0; color: #666666; font-size: 13px; line-height: 1.5;">
                          ${vp.description}
                        </p>
                      </div>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
              ` : ''}
              
              ${!isClientFacing && parsed.insights && parsed.insights.length > 0 ? `
              <!-- Key Insights (Internal) -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Key Insights</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${parsed.insights.map(insight => `
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${insight}</li>
                  `).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${!isClientFacing && parsed.trends && parsed.trends.length > 0 ? `
              <!-- Trends & Patterns (Internal) -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Trends & Patterns</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${parsed.trends.map(trend => `
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${trend}</li>
                  `).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${parsed.recommendations && parsed.recommendations.length > 0 && !isClientFacing ? `
              <!-- Recommendations (Internal Only) -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Recommendations</h2>
                <ol style="margin: 0; padding-left: 20px; color: #333333;">
                  ${parsed.recommendations.map(rec => `
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6; font-weight: 500;">${rec}</li>
                  `).join('')}
                </ol>
              </div>
              ` : ''}
              
              ${parsed.synthesis && isClientFacing ? `
              <!-- Synthesis & Path Forward -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #e8f4fd; border-radius: 4px; border-left: 4px solid #0066cc;">
                <h2 style="margin: 0 0 20px 0; color: #000000; font-size: 18px; font-weight: 600;">Synthesis & Path Forward</h2>
                <div style="color: #333333; font-size: 14px; line-height: 1.7;">
                  ${formatSynthesisForHTML(parsed.synthesis)}
                </div>
              </div>
              ` : ''}
              
              ${parsed.statistics && Object.keys(parsed.statistics).length > 0 ? `
              <!-- Statistics -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Response Statistics</h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  ${parsed.statistics.totalResponses !== undefined ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Responses:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${parsed.statistics.totalResponses}</td>
                  </tr>
                  ` : ''}
                  ${parsed.statistics.completionRate !== undefined ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Completion Rate:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${parsed.statistics.completionRate}%</td>
                  </tr>
                  ` : ''}
                  ${parsed.statistics.averageTime !== undefined ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Average Time:</td>
                    <td style="padding: 8px 0; color: #000000; font-size: 14px; font-weight: 600; text-align: right;">${parsed.statistics.averageTime}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              ` : ''}
              
              <!-- Closing -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                ${isClientFacing ? `
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    This analysis represents the collective input from all participants. We appreciate your contribution to this collaborative process.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    If you have any questions about these findings or would like to discuss next steps, please don't hesitate to reach out to our team.
                  </p>
                ` : `
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    For a more detailed analysis and to download the full report, please visit your dashboard.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                    Thank you for using Aloa® Custom Forms. If you have any questions about this analysis, please don't hesitate to reach out.
                  </p>
                `}
              </div>
              
              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px;">
                Best regards,<br>
                <strong>The Aloa® Team</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                This report was generated on ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Aloa®. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function parseAnalysisForEmail(analysisText) {
  const data = {
    summary: '',
    insights: [],
    trends: [],
    recommendations: [],
    synthesis: '',
    consensusAreas: [],
    divergenceAreas: [],
    statistics: {}
  };

  if (!analysisText) return data;
  
  // Log for debugging
  console.log('Parsing analysis text for email:', analysisText.substring(0, 500));

  // Split by sections (looking for markdown headers)
  const sections = analysisText.split(/##\s+/);
  
  sections.forEach(section => {
    const lines = section.trim().split('\n');
    const sectionTitle = lines[0].toLowerCase();
    const content = lines.slice(1).join('\n').trim();
    
    if (sectionTitle.includes('summary') || sectionTitle.includes('overview')) {
      data.summary = content.replace(/^[-•*]\s*/gm, '').trim();
    } else if (sectionTitle.includes('strongly agree') || sectionTitle.includes('team agrees') || sectionTitle.includes('where your team strongly agrees')) {
      // Parse consensus areas with more detail
      const consensusBlocks = content.split(/###\s+/).filter(Boolean);
      consensusBlocks.forEach(block => {
        const blockLines = block.trim().split('\n');
        if (blockLines.length > 0) {
          const topic = blockLines[0].trim();
          const description = blockLines.slice(1).join(' ').replace(/\*[^*]+\*/g, '').trim();
          if (topic && description) {
            data.consensusAreas.push({ topic, description });
          }
        }
      });
    } else if (sectionTitle.includes('differ') || sectionTitle.includes('diverge') || sectionTitle.includes('where perspectives differ')) {
      // Parse divergence areas with viewpoints
      const divergenceBlocks = content.split(/###\s+/).filter(Boolean);
      divergenceBlocks.forEach(block => {
        const blockLines = block.trim().split('\n');
        if (blockLines.length > 0) {
          const topic = blockLines[0].trim();
          const viewpoints = [];
          
          // Extract viewpoints from the block
          blockLines.forEach(line => {
            const viewpointMatch = line.match(/\*\*(.+?)\s*\(([\d.]+)%[^)]*\):\*\*\s*(.+)/);
            if (viewpointMatch) {
              viewpoints.push({
                label: viewpointMatch[1].trim(),
                percentage: viewpointMatch[2],
                description: viewpointMatch[3].trim()
              });
            }
          });
          
          if (topic && viewpoints.length > 0) {
            data.divergenceAreas.push({ topic, viewpoints });
          }
        }
      });
    } else if (sectionTitle.includes('insight') || sectionTitle.includes('finding')) {
      const insights = content.split(/^[-•*]\s+/m).filter(Boolean);
      data.insights = insights.map(i => i.trim());
    } else if (sectionTitle.includes('trend') || sectionTitle.includes('pattern')) {
      const trends = content.split(/^[-•*]\s+/m).filter(Boolean);
      data.trends = trends.map(t => t.trim());
    } else if (sectionTitle.includes('recommend') || sectionTitle.includes('suggestion')) {
      const recs = content.split(/^[\d.]+\s+/m).filter(Boolean);
      data.recommendations = recs.map(r => r.trim());
    } else if (sectionTitle.includes('synthesis') || sectionTitle.includes('path forward')) {
      data.synthesis = content.replace(/^[-•*]\s*/gm, '').trim();
    } else if (sectionTitle.includes('statistic') || sectionTitle.includes('metric')) {
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
        if (line.includes('overall alignment')) {
          const match = line.match(/(\d+(?:\.\d+)?)\s*%/);
          if (match) data.statistics.consensusScore = parseFloat(match[1]);
        }
      });
    }
  });

  // If no structured data found, treat entire text as summary
  if (!data.summary && data.insights.length === 0 && data.trends.length === 0) {
    // Try to extract at least the first paragraph as summary
    const paragraphs = analysisText.split(/\n\n+/);
    if (paragraphs.length > 0) {
      data.summary = paragraphs[0].replace(/^#\s+/, '').trim();
    }
  }

  return data;
}

// Export preview function for UI
export function generateEmailPreview(formTitle, analysisData, recipientName = '', isClientFacing = true) {
  const emailHTML = generateAnalysisEmailHTML(formTitle, analysisData, recipientName, isClientFacing);
  // Return both HTML and a simplified preview object
  return {
    html: emailHTML,
    preview: {
      subject: `${isClientFacing ? 'Your Input Summary' : 'AI Analysis Report'}: ${formTitle}`,
      greeting: recipientName ? `Dear ${recipientName},` : 'Hello,',
      isClientFacing,
      sections: extractSectionsFromHTML(emailHTML)
    }
  };
}

function extractSectionsFromHTML(html) {
  // Simple extraction of main sections for preview
  const sections = [];
  
  if (html.includes('Executive Summary')) {
    sections.push('Executive Summary');
  }
  if (html.includes('Key Insights')) {
    sections.push('Key Insights');
  }
  if (html.includes('Areas of Divergence')) {
    sections.push('Areas of Divergence');
  }
  if (html.includes('Synthesis & Path Forward')) {
    sections.push('Synthesis & Path Forward');
  }
  if (html.includes('Recommendations')) {
    sections.push('Recommendations');
  }
  if (html.includes('Response Statistics')) {
    sections.push('Response Statistics');
  }
  
  return sections;
}

// Format synthesis text with proper HTML
function formatSynthesisForHTML(synthesis) {
  if (!synthesis) return '';
  
  // Handle the synthesis text that might contain markdown
  let html = '';
  
  // Split by double newlines to get paragraphs
  const paragraphs = synthesis.split('\n\n');
  
  paragraphs.forEach(paragraph => {
    // Skip empty paragraphs
    if (!paragraph.trim()) return;
    
    // Check for bold headers (e.g., **Build on Strong Foundations:**)
    if (paragraph.includes('**') && paragraph.includes(':**')) {
      // Process bold headers with content
      const processedPara = paragraph
        .replace(/\*\*([^:]+):\*\*/g, '<strong style="color: #0066cc; display: block; margin-bottom: 8px;">$1:</strong>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html += `<div style="margin: 0 0 16px 0;">${processedPara}</div>`;
    }
    // Check for numbered lists
    else if (paragraph.match(/^\d+\./m)) {
      // Split by newlines and process as list items
      const items = paragraph.split('\n').filter(item => item.trim());
      html += '<ol style="margin: 0 0 16px 0; padding-left: 24px;">';
      items.forEach(item => {
        const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
        if (cleanItem) {
          html += `<li style="margin-bottom: 8px; line-height: 1.6;">${cleanItem}</li>`;
        }
      });
      html += '</ol>';
    }
    // Regular paragraph
    else {
      // Process any inline bold text
      const processedPara = paragraph
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html += `<p style="margin: 0 0 16px 0; line-height: 1.6;">${processedPara}</p>`;
    }
  });
  
  return html;
}