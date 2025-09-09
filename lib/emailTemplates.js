export function generateAnalysisEmailHTML(formTitle, analysisData, recipientName = '') {
  const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
  
  // Parse analysis data similar to PDF
  const parsed = typeof analysisData === 'string' ? parseAnalysisForEmail(analysisData) : analysisData;
  
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
            <td style="background-color: #000000; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #FFF8E8; font-size: 24px; font-weight: 600;">AI Analysis Report</h1>
              <p style="margin: 10px 0 0 0; color: #FFF8E8; font-size: 14px; opacity: 0.9;">Powered by Aloa® Custom Forms</p>
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
                We're pleased to share the AI-powered analysis of the responses collected through <strong>${formTitle}</strong>. This report provides valuable insights and recommendations based on the submitted data.
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
              
              ${parsed.insights && parsed.insights.length > 0 ? `
              <!-- Key Insights -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Key Insights</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${parsed.insights.map(insight => `
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${insight}</li>
                  `).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${parsed.trends && parsed.trends.length > 0 ? `
              <!-- Trends & Patterns -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Trends & Patterns</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333;">
                  ${parsed.trends.map(trend => `
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${trend}</li>
                  `).join('')}
                </ul>
              </div>
              ` : ''}
              
              ${parsed.recommendations && parsed.recommendations.length > 0 ? `
              <!-- Recommendations -->
              <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Recommendations</h2>
                <ol style="margin: 0; padding-left: 20px; color: #333333;">
                  ${parsed.recommendations.map(rec => `
                    <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6; font-weight: 500;">${rec}</li>
                  `).join('')}
                </ol>
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
              
              <!-- CTA Button -->
              <div style="margin: 40px 0; text-align: center;">
                <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px;">
                  For a more detailed analysis and to download the full report, please visit your dashboard.
                </p>
              </div>
              
              <!-- Closing -->
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Thank you for using Aloa® Custom Forms. If you have any questions about this analysis, please don't hesitate to reach out.
              </p>
              
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
    statistics: {}
  };

  if (!analysisText) return data;

  // Split by sections (looking for markdown headers)
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
    // Try to extract at least the first paragraph as summary
    const paragraphs = analysisText.split(/\n\n+/);
    if (paragraphs.length > 0) {
      data.summary = paragraphs[0].replace(/^#\s+/, '').trim();
    }
  }

  return data;
}