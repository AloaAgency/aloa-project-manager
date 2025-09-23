import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getProjectContext(projectId) {
  if (!projectId) return '';

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/project-knowledge/${projectId}/context?type=full_project`);

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    const context = data.context;

    if (!context) return '';

    let formatted = '\n\n=== PROJECT CONTEXT ===\n';
    formatted += `Project: ${context.project.name}\n`;
    formatted += `Description: ${context.project.description || 'N/A'}\n\n`;

    if (context.knowledge) {
      for (const [category, items] of Object.entries(context.knowledge)) {
        if (items && items.length > 0) {
          formatted += `${category.replace(/_/g, ' ').toUpperCase()}:\n`;
          items.slice(0, 3).forEach(item => {
            formatted += `- ${item.summary || item.content}\n`;
          });
        }
      }
    }

    formatted += '\n=== END PROJECT CONTEXT ===\n\n';
    return formatted;
  } catch (error) {

    return '';
  }
}

const SYSTEM_PROMPT = `You are an AI assistant specialized in creating form specifications in markdown format. Your task is to help users create, modify, and refine forms through conversation.

IMPORTANT RULES:
1. Always maintain context of the current form being built
2. When providing a form, ALWAYS wrap it in a markdown code block with triple backticks
3. Keep conversational text SEPARATE from the form markdown
4. Generate valid markdown that follows the EXACT pipe-delimited format shown below
5. Support these field types: text, email, phone, tel, number, textarea, select, checkbox, radio, date, rating, multiselect, url
6. Be conversational and helpful in your text response
7. Ask clarifying questions when needed
8. Suggest improvements based on best practices

CRITICAL FORMAT - YOU MUST USE THIS EXACT PIPE-DELIMITED FORMAT:
- Headers: # for title, ## Section: for sections (note the colon after Section)
- Fields: - type* | field_id | Label | placeholder text...
- Required fields: Add * after the type (e.g., text* for required)
- Options: For select/radio/checkbox, add indented lines with "  - Option"

RESPONSE FORMAT:
When providing a form, structure your response like this:
1. First, provide conversational text explaining what you've done
2. Then include the form in a markdown code block like this:

\`\`\`markdown
# Form Title
Description of the form (optional)

## Section: Section Name
- type* | field_id | Question or label here | Placeholder text here...
- type | field_id | Another question | Placeholder...
\`\`\`

MARKDOWN FORMAT EXAMPLE (YOU MUST FOLLOW THIS EXACTLY):
\`\`\`markdown
# Contact Form
Help us get to know you better

## Section: Personal Information
- text* | full_name | What is your full name? | Enter your full name...
- email* | email_address | What is your email address? | your@email.com...
- phone | phone_number | What is your phone number? | (555) 123-4567...

## Section: Feedback
- rating* | service_rating | How would you rate our service? | Rate from 1-5...
- textarea | comments | Any additional comments? | Share your thoughts...

## Section: Preferences
- select* | referral_source | How did you hear about us?
  - Google
  - Social Media
  - Friend
  - Other
- checkbox | newsletter | Would you like to receive updates?
  - Yes, I want updates
- radio* | contact_preference | Preferred contact method?
  - Email
  - Phone
  - Text Message
\`\`\`

When generating or modifying forms:
- Use snake_case for field_ids (e.g., first_name, email_address)
- Keep the markdown clean and properly formatted
- Use descriptive labels and helpful placeholders
- Mark required fields with * after the type
- Group related fields into sections with ## Section: Name
- Include placeholder text that guides users
- NEVER use the old (type) format - ALWAYS use the pipe format: - type | field_id | label | placeholder

Remember: ALWAYS separate your conversational response from the form markdown by using code blocks. The preview panel will only show the markdown inside the code block.`;

export async function POST(request) {
  try {
    const { messages, currentMarkdown, projectId } = await request.json();

    // Get project context if projectId is provided
    const projectContext = await getProjectContext(projectId);

    // Prepare messages for Claude
    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Add context about current markdown if it exists
    if (currentMarkdown) {
      claudeMessages.push({
        role: 'user',
        content: `[CONTEXT: Current form markdown:\n${currentMarkdown}\n\nPlease modify or enhance this based on the user's latest message.]`
      });
    }

    // Create system prompt with project context
    const systemPromptWithContext = SYSTEM_PROMPT + projectContext +
      (projectContext ? '\nUse the project context above to make the form more relevant and specific to this project.\n' : '');

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPromptWithContext,
      messages: claudeMessages,
    });

    const responseText = response.content[0].text;

    // Extract markdown if present in the response
    let extractedMarkdown = '';
    let cleanMessage = responseText;

    // Check if response contains markdown code block - more flexible regex
    const markdownMatch = responseText.match(/```(?:markdown)?\s*\n?([\s\S]*?)```/);
    if (markdownMatch) {
      extractedMarkdown = markdownMatch[1].trim();
      // Remove the markdown code block from the message shown to user
      cleanMessage = responseText.replace(/```(?:markdown)?\s*\n?[\s\S]*?```/g, '').trim();

      // If there's no other text, add a helpful message
      if (!cleanMessage || cleanMessage.length < 5) {
        cleanMessage = '✅ I\'ve generated your form! You can see it in the preview panel on the right. Feel free to ask for any modifications.';
      }
    } else {
      // Fallback: Check if the entire response looks like form markdown
      if (responseText.includes('#') && (
        responseText.includes('(text)') || 
        responseText.includes('(email)') || 
        responseText.includes('(select)') ||
        responseText.includes('(textarea)') ||
        responseText.includes('(checkbox)') ||
        responseText.includes('(radio)') ||
        responseText.includes('(number)') ||
        responseText.includes('(date)') ||
        responseText.includes('(phone)') ||
        responseText.includes('(rating)')
      )) {
        // Extract just the form part
        const lines = responseText.split('\n');
        const formLines = [];
        const messageLines = [];
        let inForm = false;
        let formEnded = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Start capturing form when we see a heading
          if (line.startsWith('#') && !formEnded) {
            inForm = true;
            formLines.push(line);
          } else if (inForm && !formEnded) {
            // Check if this line is part of the form
            if (line.includes('(') || line.includes('*') || line.startsWith('#') || line.trim() === '') {
              formLines.push(line);
            } else {
              // This looks like explanatory text, form has ended
              formEnded = true;
              messageLines.push(line);
            }
          } else if (!inForm || formEnded) {
            messageLines.push(line);
          }
        }

        if (formLines.length > 0) {
          extractedMarkdown = formLines.join('\n').trim();
          cleanMessage = messageLines.join('\n').trim() || '✅ I\'ve created your form! Check the preview panel.';
        }
      }
    }

    // If we have markdown, update it; otherwise keep the current one
    const finalMarkdown = extractedMarkdown || currentMarkdown;

    return NextResponse.json({
      message: cleanMessage,
      markdown: finalMarkdown,
    });
  } catch (error) {

    // Fallback to using a simpler model if the main one fails
    if (error.message?.includes('model')) {
      try {
        const { messages } = await request.json();
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();

        // Generate a simple form based on keywords
        const simpleMarkdown = generateSimpleForm(lastUserMessage?.content || '');

        return NextResponse.json({
          message: 'I\'ve created a basic form structure for you. Feel free to ask me to modify any part of it!',
          markdown: simpleMarkdown,
        });
      } catch (fallbackError) {

      }
    }

    return NextResponse.json(
      { error: 'Failed to generate form. Please try again.' },
      { status: 500 }
    );
  }
}

function generateSimpleForm(userInput) {
  const input = userInput.toLowerCase();

  // Detect form type based on keywords
  if (input.includes('contact') || input.includes('get in touch')) {
    return `# Contact Form

## Personal Information
What is your name? (text) *
What is your email address? (email) *
What is your phone number? (phone)

## Your Message
What is the subject of your inquiry? (text) *
Please provide details about your inquiry (textarea) *

## Preferences
How would you prefer to be contacted? (radio: Email, Phone, Either) *
Would you like to subscribe to our newsletter? (checkbox: Yes, subscribe me)`;
  } else if (input.includes('feedback') || input.includes('review')) {
    return `# Feedback Form

## Your Information
Name (text) *
Email (email) *

## Your Feedback
How would you rate your overall experience? (rating) *
What did you like most? (textarea)
What could we improve? (textarea)

## Follow-up
May we contact you about your feedback? (radio: Yes, No) *`;
  } else if (input.includes('application') || input.includes('job') || input.includes('apply')) {
    return `# Job Application Form

## Personal Information
Full Name (text) *
Email Address (email) *
Phone Number (phone) *
Current Location (text) *

## Professional Background
Current Job Title (text)
Years of Experience (number) *
LinkedIn Profile (text)
Resume/CV Link (text)

## Application Details
Position Applied For (select: Software Engineer, Product Manager, Designer, Marketing, Sales, Other) *
How did you hear about this position? (select: Company Website, LinkedIn, Indeed, Referral, Other) *
Why are you interested in this role? (textarea) *

## Availability
When can you start? (date) *
Salary Expectations (text)`;
  } else if (input.includes('register') || input.includes('registration') || input.includes('sign up')) {
    return `# Registration Form

## Account Information
Username (text) *
Email Address (email) *
Password (text) *
Confirm Password (text) *

## Personal Details
First Name (text) *
Last Name (text) *
Date of Birth (date)
Phone Number (phone)

## Preferences
Preferred Language (select: English, Spanish, French, German, Other)
Receive Newsletter (checkbox: Yes, I want to receive updates)
Accept Terms and Conditions (checkbox: I accept the terms) *`;
  } else {
    // Generic form based on what was mentioned
    return `# Custom Form

## Section 1
Question 1 (text) *
Question 2 (email) *
Question 3 (textarea)

## Section 2
Select an option (select: Option 1, Option 2, Option 3) *
Rate your experience (rating)
Additional comments (textarea)

## Confirmation
I confirm the information is accurate (checkbox: Yes) *`;
  }
}