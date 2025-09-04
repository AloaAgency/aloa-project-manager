import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant specialized in creating form specifications in markdown format. Your task is to help users create, modify, and refine forms through conversation.

IMPORTANT RULES:
1. Always maintain context of the current form being built
2. Generate valid markdown that follows this exact format:
   - # Form Title
   - ## Section Name
   - Field descriptions with proper types in parentheses
3. Support these field types: (text), (email), (phone), (number), (textarea), (select), (checkbox), (radio), (date), (rating)
4. Be conversational and helpful
5. Ask clarifying questions when needed
6. Suggest improvements based on best practices

MARKDOWN FORMAT EXAMPLE:
# Contact Form

## Personal Information
What is your full name? (text) *
What is your email address? (email) *
What is your phone number? (phone)

## Feedback
How would you rate our service? (rating) *
Any additional comments? (textarea)

## Preferences
How did you hear about us? (select: Google, Social Media, Friend, Other) *
Would you like to receive updates? (checkbox: Yes, I want updates)

When generating or modifying forms:
- Keep the markdown clean and properly formatted
- Use descriptive questions/labels
- Mark required fields with *
- Group related fields into sections
- Suggest logical field types based on the data being collected

Remember: You're having a conversation to help build the perfect form. Be friendly, ask for clarification when needed, and make helpful suggestions.`;

export async function POST(request) {
  try {
    const { messages, currentMarkdown } = await request.json();

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

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    const responseText = response.content[0].text;
    
    // Extract markdown if present in the response
    let extractedMarkdown = '';
    
    // Check if response contains markdown code block
    const markdownMatch = responseText.match(/```(?:markdown)?\n([\s\S]*?)```/);
    if (markdownMatch) {
      extractedMarkdown = markdownMatch[1].trim();
    } else {
      // Check if the entire response looks like form markdown
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
        let inForm = false;
        
        for (const line of lines) {
          if (line.startsWith('#')) {
            inForm = true;
          }
          if (inForm) {
            formLines.push(line);
          }
          // Stop if we hit explanatory text after the form
          if (inForm && line.trim() === '' && formLines.length > 3) {
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine && !nextLine.startsWith('#') && !nextLine.includes('(') && !nextLine.includes('*')) {
              break;
            }
          }
        }
        
        if (formLines.length > 0) {
          extractedMarkdown = formLines.join('\n').trim();
        }
      }
    }

    // If we have markdown, update it; otherwise keep the current one
    const finalMarkdown = extractedMarkdown || currentMarkdown;

    // Clean the response text to not show raw markdown to user
    let cleanMessage = responseText;
    if (markdownMatch) {
      cleanMessage = responseText.replace(/```(?:markdown)?\n[\s\S]*?```/g, '✅ I\'ve generated/updated your form. You can see it in the preview panel!').trim();
    } else if (extractedMarkdown) {
      // Remove the form markdown from the message
      cleanMessage = responseText.replace(extractedMarkdown, '').trim();
      if (!cleanMessage || cleanMessage.length < 10) {
        cleanMessage = '✅ I\'ve updated your form based on your request. Check the preview panel!';
      }
    }

    return NextResponse.json({
      message: cleanMessage,
      markdown: finalMarkdown,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    
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
        console.error('Fallback error:', fallbackError);
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