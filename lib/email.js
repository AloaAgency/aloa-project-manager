import { Resend } from 'resend';
import { sanitizeEmail, sanitizeText, sanitizeHTML } from './security';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendFormResponseEmail({ form, responses, recipientEmail }) {
  try {
    // Skip email sending if no API key is configured
    if (!resend) {

      return { success: true, skipped: true, message: 'Email notifications not configured' };
    }

    // Sanitize recipient email to prevent header injection
    let sanitizedRecipient;
    try {
      sanitizedRecipient = recipientEmail ? sanitizeEmail(recipientEmail) : 'info@aloa.agency';
    } catch (error) {

      sanitizedRecipient = 'info@aloa.agency'; // Fallback to default
    }

    // Sanitize form title to prevent injection in subject
    const sanitizedTitle = sanitizeText(form.title || 'Untitled Form')
      .replace(/[\n\r]/g, '')
      .substring(0, 100);

    // Format the responses into a clean HTML email
    const htmlContent = generateEmailHTML(form, responses);

    const data = await resend.emails.send({
      from: 'Aloa Forms <forms@updates.aloa.agency>',
      to: sanitizedRecipient,
      subject: `New Response: ${sanitizedTitle}`,
      html: htmlContent,
    });

    return { success: true, data };
  } catch (error) {

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

export async function sendProjectInvitationEmail({ projectName, clientName, clientEmail, projectId }) {
  try {
    // Skip email sending if no API key is configured
    if (!resend) {

      return { success: true, skipped: true, message: 'Email notifications not configured' };
    }

    // Sanitize inputs
    let sanitizedEmail;
    try {
      sanitizedEmail = sanitizeEmail(clientEmail);
    } catch (error) {

      return { success: false, error: 'Invalid email address' };
    }

    const sanitizedProjectName = sanitizeText(projectName).substring(0, 100);
    const sanitizedClientName = sanitizeText(clientName).substring(0, 100);

    // Get base URL for the project dashboard link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   process.env.NEXT_PUBLIC_BASE_URL ||
                   'https://aloa-project-manager.vercel.app';
    const projectUrl = `${baseUrl}/project/${projectId}/dashboard`;
    const loginUrl = `${baseUrl}/auth/login`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Your Aloa Project</title>
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
            background: linear-gradient(135deg, #000000 0%, #333333 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .logo {
            width: 150px;
            height: auto;
            margin-bottom: 20px;
          }
          .content {
            padding: 40px 30px;
          }
          .welcome-text {
            font-size: 18px;
            color: #333;
            margin-bottom: 25px;
          }
          .info-box {
            background: #f8f9fa;
            border-left: 4px solid #000;
            padding: 20px;
            margin: 25px 0;
            border-radius: 6px;
          }
          .info-box h3 {
            margin: 0 0 10px 0;
            color: #000;
            font-size: 16px;
            font-weight: 600;
          }
          .info-box p {
            margin: 5px 0;
            color: #555;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button {
            display: inline-block;
            background: #000;
            color: #faf8f3;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
          }
          .button:hover {
            background: #333;
          }
          .steps {
            margin: 30px 0;
          }
          .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .step-number {
            background: #000;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 15px;
            flex-shrink: 0;
          }
          .step-content {
            flex: 1;
          }
          .step-content h4 {
            margin: 0 0 5px 0;
            font-size: 16px;
            font-weight: 600;
          }
          .step-content p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
          .footer {
            background: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            font-size: 13px;
            color: #666;
          }
          .footer a {
            color: #000;
            text-decoration: none;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg" alt="Aloa" class="logo">
            <h1>Welcome to Your Project Dashboard</h1>
          </div>

          <div class="content">
            <p class="welcome-text">
              Hi ${sanitizedClientName},
            </p>

            <p style="font-size: 16px; line-height: 1.6;">
              We're excited to get started on <strong>${sanitizedProjectName}</strong>!
              Your dedicated project dashboard is now ready, where you can track progress,
              submit information, and collaborate with our team throughout the project.
            </p>

            <div class="info-box">
              <h3>Your Project Details</h3>
              <p><strong>Project:</strong> ${sanitizedProjectName}</p>
              <p><strong>Your Role:</strong> Client Administrator</p>
              <p><strong>Email:</strong> ${sanitizedEmail}</p>
            </div>

            <div class="button-container">
              <a href="${loginUrl}" class="button">Access Your Dashboard</a>
            </div>

            <div class="steps">
              <h3 style="margin-bottom: 20px;">Getting Started:</h3>

              <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h4>Sign In or Create Account</h4>
                  <p>Use your email address (${sanitizedEmail}) to sign in. If you don't have an account yet, you can create one with this email.</p>
                </div>
              </div>

              <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h4>Explore Your Dashboard</h4>
                  <p>View project milestones, complete forms, and track real-time progress.</p>
                </div>
              </div>

              <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h4>Complete Initial Tasks</h4>
                  <p>We'll guide you through providing the information we need to bring your vision to life.</p>
                </div>
              </div>
            </div>

            <p style="margin-top: 30px; padding: 20px; background: #fff8dc; border-radius: 8px; border: 1px solid #ffd700;">
              <strong>💡 Pro Tip:</strong> Bookmark your dashboard URL for quick access: <br>
              <a href="${projectUrl}" style="color: #000; word-break: break-all;">${projectUrl}</a>
            </p>
          </div>

          <div class="footer">
            <p>
              Questions? Reply to this email or contact your project manager.<br>
              <a href="${baseUrl}">Visit Aloa Project Manager</a>
            </p>
            <p style="margin-top: 15px; color: #999;">
              © ${new Date().getFullYear()} <strong>Aloa® Agency</strong>. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: 'Aloa Projects <projects@updates.aloa.agency>',
      to: sanitizedEmail,
      subject: `Welcome to ${sanitizedProjectName} - Your Project Dashboard is Ready`,
      html: htmlContent,
    });

    return { success: true, data };
  } catch (error) {

    return { success: false, error: error.message };
  }
}

export default { sendFormResponseEmail, sendProjectInvitationEmail };