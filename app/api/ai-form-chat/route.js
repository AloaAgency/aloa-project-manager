import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase-service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getProjectContext(projectId) {
  if (!projectId) return '';

  try {
    const supabase = createServiceClient();

    const { data: project, error: projectError } = await supabase
      .from('aloa_projects')
      .select('id, project_name, description, metadata')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return '';
    }

    const { data: knowledge } = await supabase
      .from('aloa_project_knowledge')
      .select('category, content_summary, content, importance_score')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    let formatted = '\n\n=== PROJECT CONTEXT ===\n';
    formatted += `Project: ${project.project_name}\n`;
    formatted += `Description: ${project.description || 'N/A'}\n\n`;

    if (knowledge && knowledge.length > 0) {
      const grouped = knowledge.reduce((acc, item) => {
        const category = item.category || 'general';
        acc[category] = acc[category] || [];
        acc[category].push(item);
        return acc;
      }, {});

      for (const [category, items] of Object.entries(grouped)) {
        formatted += `${category.replace(/_/g, ' ').toUpperCase()}:\n`;
        items.slice(0, 3).forEach(item => {
          formatted += `- ${item.content_summary || item.content}\n`;
        });
        formatted += '\n';
      }
    }

    formatted += '=== END PROJECT CONTEXT ===\n\n';
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
9. **CRITICAL: EVERY FORM MUST START WITH A TITLE LINE (# Title)**

CRITICAL FORMAT - YOU MUST USE THIS EXACT PIPE-DELIMITED FORMAT:
- **REQUIRED: Form must start with # Title line**
- Headers: # for title (REQUIRED FIRST LINE), ## Section: for sections (note the colon after Section)
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

MARKDOWN FORMAT EXAMPLE (YOU MUST FOLLOW THIS EXACTLY - NOTE THE # TITLE AS FIRST LINE):
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

IMPORTANT: Notice how the form ALWAYS starts with "# Contact Form" - this title line is MANDATORY!

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
Help us get in touch with you

## Section: Personal Information
- text* | full_name | What is your name? | Enter your full name
- email* | email_address | What is your email address? | your@email.com
- phone | phone_number | What is your phone number? | (555) 123-4567

## Section: Your Message
- text* | subject | What is the subject of your inquiry? | Brief subject
- textarea* | message | Please provide details about your inquiry | Your message here

## Section: Preferences
- radio* | contact_method | How would you prefer to be contacted?
  - Email
  - Phone
  - Either
- checkbox | newsletter | Would you like to subscribe to our newsletter?
  - Yes, subscribe me`;
  } else if (input.includes('feedback') || input.includes('review')) {
    return `# Feedback Form
Share your thoughts with us

## Section: Your Information
- text* | name | Name | Your full name
- email* | email | Email | your@email.com

## Section: Your Feedback
- rating* | experience_rating | How would you rate your overall experience? | Rate 1-5
- textarea | liked_most | What did you like most? | Tell us what you enjoyed
- textarea | improvements | What could we improve? | Suggestions for improvement

## Section: Follow-up
- radio* | contact_permission | May we contact you about your feedback?
  - Yes
  - No`;
  } else if (input.includes('application') || input.includes('job') || input.includes('apply')) {
    return `# Job Application Form
Apply for a position with our team

## Section: Personal Information
- text* | full_name | Full Name | Your full name
- email* | email_address | Email Address | your@email.com
- phone* | phone_number | Phone Number | (555) 123-4567
- text* | location | Current Location | City, State

## Section: Professional Background
- text | job_title | Current Job Title | Your current role
- number* | years_experience | Years of Experience | Number of years
- text | linkedin | LinkedIn Profile | https://linkedin.com/in/yourprofile
- text | resume | Resume/CV Link | Link to your resume

## Section: Application Details
- select* | position | Position Applied For
  - Software Engineer
  - Product Manager
  - Designer
  - Marketing
  - Sales
  - Other
- select* | referral_source | How did you hear about this position?
  - Company Website
  - LinkedIn
  - Indeed
  - Referral
  - Other
- textarea* | interest | Why are you interested in this role? | Tell us why you're a great fit

## Section: Availability
- date* | start_date | When can you start? | Select a date
- text | salary | Salary Expectations | Your expected salary range`;
  } else if (input.includes('register') || input.includes('registration') || input.includes('sign up')) {
    return `# Registration Form
Create your account

## Section: Account Information
- text* | username | Username | Choose a username
- email* | email_address | Email Address | your@email.com
- text* | password | Password | Create a secure password
- text* | confirm_password | Confirm Password | Re-enter your password

## Section: Personal Details
- text* | first_name | First Name | Your first name
- text* | last_name | Last Name | Your last name
- date | date_of_birth | Date of Birth | MM/DD/YYYY
- phone | phone_number | Phone Number | (555) 123-4567

## Section: Preferences
- select | language | Preferred Language
  - English
  - Spanish
  - French
  - German
  - Other
- checkbox | newsletter | Receive Newsletter
  - Yes, I want to receive updates
- checkbox* | terms | Accept Terms and Conditions
  - I accept the terms`;
  } else {
    // Generic form based on what was mentioned
    return `# Custom Form
Complete the form below

## Section: General Information
- text* | question_1 | Question 1 | Your answer
- email* | email | Question 2 | your@email.com
- textarea | question_3 | Question 3 | Your detailed answer

## Section: Additional Details
- select* | option | Select an option
  - Option 1
  - Option 2
  - Option 3
- rating | rating | Rate your experience | 1-5 stars
- textarea | comments | Additional comments | Any other feedback

## Section: Confirmation
- checkbox* | confirm | I confirm the information is accurate
  - Yes`;
  }
}
