import { Resend } from 'resend';
import { sanitizeEmail, sanitizeText, sanitizeHTML } from './security';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendFormResponseEmail({ form, responses, recipientEmail }) {
  try {
    // Skip email sending if no API key is configured
    if (!resend) {
      console.log('Email notifications disabled: RESEND_API_KEY not configured');
      return { success: true, skipped: true, message: 'Email notifications not configured' };
    }
    
    // Sanitize recipient email to prevent header injection
    let sanitizedRecipient;
    try {
      sanitizedRecipient = recipientEmail ? sanitizeEmail(recipientEmail) : 'ross@aloa.agency';
    } catch (error) {
      console.error('Invalid recipient email:', error);
      sanitizedRecipient = 'ross@aloa.agency'; // Fallback to default
    }
    
    // Sanitize form title to prevent injection in subject
    const sanitizedTitle = sanitizeText(form.title || 'Untitled Form')
      .replace(/[\n\r]/g, '')
      .substring(0, 100);
    
    // Format the responses into a clean HTML email
    const htmlContent = generateEmailHTML(form, responses);
    
    const data = await resend.emails.send({
      from: 'Aloa Forms <onboarding@resend.dev>',
      to: sanitizedRecipient,
      subject: `New Response: ${sanitizedTitle}`,
      html: htmlContent,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

function generateEmailHTML(form, responses) {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Form Response</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .email-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          padding: 30px;
        }
        .response-section {
          margin-bottom: 25px;
          padding-bottom: 25px;
          border-bottom: 1px solid #e5e5e5;
        }
        .response-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .section-title {
          color: #667eea;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
        }
        .field {
          margin-bottom: 20px;
        }
        .field-label {
          font-weight: 600;
          color: #555;
          margin-bottom: 5px;
          font-size: 14px;
        }
        .field-value {
          color: #333;
          font-size: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #667eea;
        }
        .field-value.empty {
          color: #999;
          font-style: italic;
          border-left-color: #ddd;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
        .timestamp {
          background: #f0f0f0;
          padding: 10px 30px;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #e5e5e5;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" alt="Aloa" class="logo">
          <h1>New Form Response</h1>
          <p>${sanitizeHTML(form.title || 'Untitled Form')}</p>
        </div>
        
        <div class="timestamp">
          <strong>Submitted:</strong> ${timestamp}
        </div>
        
        <div class="content">
          ${generateResponseFields(form.fields, responses)}
        </div>
        
        <div class="footer">
          <p>
            This response was submitted via your custom form.<br>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://custom-forms-xi.vercel.app'}/responses/${form.id}">
              View all responses →
            </a>
          </p>
          <p style="margin-top: 15px; color: #999;">
            Powered by <strong>Aloa® Agency</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateResponseFields(fields, responses) {
  // Group fields by section
  const sections = {};
  
  fields.forEach(field => {
    const section = field.validation?.section || 'General Information';
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(field);
  });

  let html = '';
  
  Object.entries(sections).forEach(([sectionName, sectionFields]) => {
    html += `
      <div class="response-section">
        <div class="section-title">${sanitizeHTML(sectionName)}</div>
    `;
    
    sectionFields.forEach(field => {
      const value = responses[field.field_name] || responses[field.name];
      const displayValue = formatFieldValue(value, field);
      const sanitizedLabel = sanitizeHTML(field.field_label || field.label || 'Unnamed Field');
      
      html += `
        <div class="field">
          <div class="field-label">${sanitizedLabel}</div>
          <div class="field-value ${!displayValue ? 'empty' : ''}">
            ${displayValue || 'No response provided'}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  });
  
  return html;
}

function formatFieldValue(value, field) {
  if (!value) return '';
  
  // Handle arrays (checkboxes, multi-select)
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.map(v => `• ${sanitizeHTML(String(v))}`).join('<br>');
  }
  
  // Handle rating fields
  if (field.field_type === 'rating' || field.type === 'rating') {
    const rating = parseInt(value, 10);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      return 'Invalid rating';
    }
    return `${rating} / 5 ⭐`;
  }
  
  // Handle long text with line breaks - sanitize to prevent XSS
  if (typeof value === 'string') {
    const sanitized = sanitizeHTML(value);
    if (value.includes('\n')) {
      return sanitized.replace(/\n/g, '<br>');
    }
    return sanitized;
  }
  
  return sanitizeHTML(String(value));
}

export default { sendFormResponseEmail };