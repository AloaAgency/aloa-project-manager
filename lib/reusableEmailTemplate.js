/**
 * REUSABLE EMAIL TEMPLATE
 *
 * Copy this file to any project for professional, email-client-compatible HTML emails.
 *
 * Features:
 * - Table-based layout for maximum compatibility
 * - Inline styles (required for email clients)
 * - MSO conditional comments for Outlook
 * - Responsive design (600px max width)
 * - Dark header with logo support
 * - Customizable color scheme
 *
 * Usage:
 * import { createEmail } from './reusableEmailTemplate';
 *
 * const html = createEmail({
 *   logoUrl: 'https://yoursite.com/logo.svg',
 *   title: 'Welcome to Our App',
 *   subtitle: 'Getting started guide',
 *   greeting: 'Hi John,',
 *   sections: [
 *     {
 *       type: 'paragraph',
 *       content: 'Thank you for signing up!'
 *     },
 *     {
 *       type: 'highlight',
 *       title: 'Important Information',
 *       content: 'Your account is ready to use.'
 *     },
 *     {
 *       type: 'button',
 *       text: 'Get Started',
 *       url: 'https://yoursite.com/dashboard'
 *     }
 *   ],
 *   footer: {
 *     companyName: 'Your Company',
 *     year: new Date().getFullYear()
 *   }
 * });
 */

/**
 * Color scheme - customize these for your brand
 */
const DEFAULT_COLORS = {
  // Header
  headerBackground: '#000000',
  headerText: '#FFF8E8',

  // Body
  bodyBackground: '#ffffff',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',

  // Accents
  highlightBackground: '#FFF8E8',
  highlightBorder: '#000000',
  successBackground: '#e8f5e9',
  successBorder: '#4caf50',
  successText: '#2e7d32',
  warningBackground: '#fff3e0',
  warningBorder: '#ff9800',
  warningText: '#e65100',
  infoBackground: '#e8f4fd',
  infoBorder: '#0066cc',

  // Buttons
  buttonBackground: '#000000',
  buttonText: '#FFF8E8',

  // Footer
  footerBackground: '#f8f9fa',

  // Container
  containerBackground: '#f5f5f5',
};

/**
 * Main email generator function
 */
export function createEmail(options) {
  const {
    logoUrl = '',
    logoHeight = '40px',
    title = 'Email Title',
    subtitle = '',
    greeting = 'Hello,',
    sections = [],
    footer = {},
    colors = {},
    customStyles = {}
  } = options;

  // Merge custom colors with defaults
  const c = { ...DEFAULT_COLORS, ...colors };

  // Generate timestamp
  const timestamp = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${c.containerBackground};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${c.containerBackground};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: ${c.bodyBackground}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${c.headerBackground}; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              ${logoUrl ? `
              <img src="${logoUrl}"
                   alt="Logo"
                   style="height: ${logoHeight}; width: auto; margin: 0 auto 20px auto; display: block;"
              />
              ` : ''}
              <h1 style="margin: 0 0 10px 0; color: ${c.headerText}; font-size: 28px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ${title}
              </h1>
              ${subtitle ? `
              <p style="margin: 0; color: ${c.headerText}; font-size: 16px; opacity: 0.9;">
                ${subtitle}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">

              ${greeting ? `
              <p style="margin: 0 0 20px 0; color: ${c.textPrimary}; font-size: 16px; line-height: 1.5;">
                ${greeting}
              </p>
              ` : ''}

              ${sections.map(section => renderSection(section, c)).join('')}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: ${c.footerBackground}; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: ${c.textMuted}; font-size: 12px;">
                ${footer.customText || `This email was sent on ${timestamp}`}
              </p>
              ${footer.companyName ? `
              <p style="margin: 0; color: ${c.textMuted}; font-size: 12px;">
                © ${footer.year || new Date().getFullYear()} ${footer.companyName}. All rights reserved.
              </p>
              ` : ''}
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

/**
 * Render individual section based on type
 */
function renderSection(section, colors) {
  switch (section.type) {
    case 'paragraph':
      return `
        <p style="margin: 0 0 20px 0; color: ${colors.textSecondary}; font-size: 14px; line-height: 1.6;">
          ${section.content}
        </p>
      `;

    case 'heading':
      return `
        <h2 style="margin: 0 0 20px 0; color: ${colors.textPrimary}; font-size: 20px; font-weight: 600;">
          ${section.content}
        </h2>
      `;

    case 'highlight':
      return `
        <div style="margin-bottom: 30px; padding: 20px; background-color: ${colors.highlightBackground}; border-left: 4px solid ${colors.highlightBorder}; border-radius: 4px;">
          ${section.title ? `
            <h2 style="margin: 0 0 15px 0; color: ${colors.textPrimary}; font-size: 18px; font-weight: 600;">${section.title}</h2>
          ` : ''}
          <p style="margin: 0; color: ${colors.textPrimary}; font-size: 14px; line-height: 1.6;">
            ${section.content}
          </p>
        </div>
      `;

    case 'success':
      return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: ${colors.successBackground}; border-left: 4px solid ${colors.successBorder}; border-radius: 4px;">
          ${section.title ? `
            <h3 style="margin: 0 0 10px 0; color: ${colors.successText}; font-size: 16px; font-weight: 600;">${section.title}</h3>
          ` : ''}
          <p style="margin: 0; color: ${colors.textPrimary}; font-size: 14px; line-height: 1.6;">
            ${section.content}
          </p>
        </div>
      `;

    case 'warning':
      return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: ${colors.warningBackground}; border-left: 4px solid ${colors.warningBorder}; border-radius: 4px;">
          ${section.title ? `
            <h3 style="margin: 0 0 10px 0; color: ${colors.warningText}; font-size: 16px; font-weight: 600;">${section.title}</h3>
          ` : ''}
          <p style="margin: 0; color: ${colors.textPrimary}; font-size: 14px; line-height: 1.6;">
            ${section.content}
          </p>
        </div>
      `;

    case 'info':
      return `
        <div style="margin-bottom: 30px; padding: 20px; background-color: ${colors.infoBackground}; border-radius: 4px; border-left: 4px solid ${colors.infoBorder};">
          ${section.title ? `
            <h2 style="margin: 0 0 20px 0; color: ${colors.textPrimary}; font-size: 18px; font-weight: 600;">${section.title}</h2>
          ` : ''}
          <div style="color: ${colors.textPrimary}; font-size: 14px; line-height: 1.7;">
            ${section.content}
          </div>
        </div>
      `;

    case 'list':
      return `
        <div style="margin-bottom: 30px;">
          ${section.title ? `
            <h2 style="margin: 0 0 15px 0; color: ${colors.textPrimary}; font-size: 18px; font-weight: 600;">${section.title}</h2>
          ` : ''}
          <ul style="margin: 0; padding-left: 20px; color: ${colors.textPrimary};">
            ${section.items.map(item => `
              <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${item}</li>
            `).join('')}
          </ul>
        </div>
      `;

    case 'numberedList':
      return `
        <div style="margin-bottom: 30px;">
          ${section.title ? `
            <h2 style="margin: 0 0 15px 0; color: ${colors.textPrimary}; font-size: 18px; font-weight: 600;">${section.title}</h2>
          ` : ''}
          <ol style="margin: 0; padding-left: 20px; color: ${colors.textPrimary};">
            ${section.items.map(item => `
              <li style="margin-bottom: 10px; font-size: 14px; line-height: 1.6;">${item}</li>
            `).join('')}
          </ol>
        </div>
      `;

    case 'button':
      return `
        <div style="margin: 30px 0; text-align: center;">
          <a href="${section.url}"
             style="display: inline-block; padding: 14px 32px; background-color: ${colors.buttonBackground}; color: ${colors.buttonText}; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            ${section.text}
          </a>
        </div>
      `;

    case 'divider':
      return `
        <div style="margin: 30px 0; border-top: 1px solid #e0e0e0;"></div>
      `;

    case 'spacer':
      return `
        <div style="height: ${section.height || '20px'};"></div>
      `;

    case 'table':
      return `
        <div style="margin-bottom: 30px;">
          ${section.title ? `
            <h2 style="margin: 0 0 15px 0; color: ${colors.textPrimary}; font-size: 18px; font-weight: 600;">${section.title}</h2>
          ` : ''}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${section.rows.map(row => `
              <tr>
                <td style="padding: 8px 0; color: ${colors.textSecondary}; font-size: 14px;">${row.label}:</td>
                <td style="padding: 8px 0; color: ${colors.textPrimary}; font-size: 14px; font-weight: 600; text-align: right;">${row.value}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;

    case 'html':
      // Allow custom HTML injection
      return section.content;

    default:
      return '';
  }
}

/**
 * Quick helper for simple transactional emails
 */
export function createSimpleEmail(options) {
  const {
    title,
    message,
    buttonText,
    buttonUrl,
    companyName = 'Your Company',
    logoUrl
  } = options;

  return createEmail({
    logoUrl,
    title,
    greeting: 'Hello,',
    sections: [
      {
        type: 'paragraph',
        content: message
      },
      ...(buttonText && buttonUrl ? [{
        type: 'button',
        text: buttonText,
        url: buttonUrl
      }] : []),
      {
        type: 'divider'
      },
      {
        type: 'paragraph',
        content: `If you have any questions, please don't hesitate to reach out.`
      },
      {
        type: 'paragraph',
        content: `Best regards,<br><strong>The ${companyName} Team</strong>`
      }
    ],
    footer: {
      companyName
    }
  });
}

/**
 * EXAMPLE USAGE
 */
export function exampleUsage() {
  // Example 1: Complex email with multiple sections
  const complexEmail = createEmail({
    logoUrl: 'https://images.ctfassets.net/qkznfzcikv51/xWpsUAypBrRgAjmbyLGYy/b969f4353174e4f209996ebf60af8f7c/aloa_-_white.svg',
    title: 'Welcome to Our Platform',
    subtitle: 'Getting started guide',
    greeting: 'Hi John,',
    sections: [
      {
        type: 'paragraph',
        content: 'Thank you for signing up! We\'re excited to have you on board.'
      },
      {
        type: 'highlight',
        title: 'Your Account is Ready',
        content: 'You can now access all features of the platform. Get started by clicking the button below.'
      },
      {
        type: 'button',
        text: 'Go to Dashboard',
        url: 'https://yourapp.com/dashboard'
      },
      {
        type: 'divider'
      },
      {
        type: 'heading',
        content: 'Next Steps'
      },
      {
        type: 'numberedList',
        items: [
          'Complete your profile settings',
          'Invite team members',
          'Create your first project',
          'Explore the documentation'
        ]
      },
      {
        type: 'info',
        title: 'Need Help?',
        content: 'Our support team is here to help you get started. Visit our help center or reply to this email with any questions.'
      }
    ],
    footer: {
      companyName: 'Your Company'
    }
  });

  // Example 2: Simple notification email
  const simpleEmail = createSimpleEmail({
    logoUrl: 'https://yourapp.com/logo.svg',
    title: 'Password Reset',
    message: 'You requested a password reset. Click the button below to create a new password. This link expires in 24 hours.',
    buttonText: 'Reset Password',
    buttonUrl: 'https://yourapp.com/reset/abc123',
    companyName: 'Your Company'
  });

  // Example 3: Custom color scheme
  const brandedEmail = createEmail({
    logoUrl: 'https://yourapp.com/logo.svg',
    title: 'Custom Branding',
    sections: [
      {
        type: 'paragraph',
        content: 'This email uses custom brand colors.'
      }
    ],
    colors: {
      headerBackground: '#2563eb',
      headerText: '#ffffff',
      buttonBackground: '#2563eb',
      buttonText: '#ffffff',
      highlightBackground: '#dbeafe',
      highlightBorder: '#2563eb'
    },
    footer: {
      companyName: 'Your Company'
    }
  });

  return { complexEmail, simpleEmail, brandedEmail };
}
