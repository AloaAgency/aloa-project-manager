import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateAnalysisEmailHTML } from '@/lib/emailTemplates';

// Initialize Supabase only if credentials are available
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request, { params }) {
  try {
    const { formId } = params;
    const { 
      recipientEmail, 
      recipientName, 
      analysisText, 
      formTitle,
      ccEmails = [],
      customSubject,
      isClientFacing = true 
    } = await request.json();

    // Validate required fields
    if (!recipientEmail || !analysisText || !formTitle) {
      return NextResponse.json(
        { error: 'Recipient email, analysis text, and form title are required' },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!resend) {
      console.warn('RESEND_API_KEY not configured, email sending disabled');
      return NextResponse.json(
        { error: 'Email service not configured. Please set up RESEND_API_KEY.' },
        { status: 503 }
      );
    }

    // Parse the analysis data if it's a JSON string
    let parsedAnalysis;
    try {
      parsedAnalysis = typeof analysisText === 'string' && analysisText.startsWith('{') 
        ? JSON.parse(analysisText)
        : analysisText;
    } catch (e) {
      // If it's not JSON, treat it as plain text
      parsedAnalysis = analysisText;
    }
    
    // Generate the email HTML
    const emailHTML = generateAnalysisEmailHTML(formTitle, parsedAnalysis, recipientName, isClientFacing);
    
    // Prepare email options
    const emailOptions = {
      from: process.env.EMAIL_FROM || 'Aloa® Forms <forms@resend.dev>',
      to: recipientEmail,
      subject: customSubject || (isClientFacing ? `Your Input Summary: ${formTitle}` : `AI Analysis Report: ${formTitle}`),
      html: emailHTML,
      text: generatePlainTextVersion(analysisText, formTitle), // Fallback plain text
    };

    // Add CC recipients if provided
    if (ccEmails.length > 0) {
      emailOptions.cc = ccEmails;
    }

    // Send the email
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Error sending analysis email:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      );
    }

    // Log the email send event
    console.log(`Analysis email sent successfully for form ${formId} to ${recipientEmail}`);

    // Optionally store email send record in database
    if (supabase) {
      try {
        await supabase
          .from('aloa_email_logs')
          .insert({
            aloa_form_id: formId,
            recipient: recipientEmail,
            email_type: isClientFacing ? 'client_analysis' : 'ai_analysis',
            sent_at: new Date().toISOString(),
            status: 'sent'
          });
      } catch (dbError) {
        // Don't fail the request if logging fails
        console.error('Failed to log email send:', dbError);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Analysis email sent successfully',
      emailId: data?.id
    });

  } catch (error) {
    console.error('Error in email analysis endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to send analysis email' },
      { status: 500 }
    );
  }
}

// Generate plain text version as fallback
function generatePlainTextVersion(analysisText, formTitle) {
  return `
AI Analysis Report - ${formTitle}

${analysisText}

---
Generated on ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Powered by Aloa® Custom Forms
  `.trim();
}