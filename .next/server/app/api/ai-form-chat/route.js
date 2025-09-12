"use strict";(()=>{var e={};e.id=3068,e.ids=[3068],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},22736:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>f,patchFetch:()=>y,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>h,staticGenerationAsyncStorage:()=>p});var r={};o.r(r),o.d(r,{POST:()=>d});var a=o(49303),i=o(88716),n=o(60670),s=o(87070);let l=new(o(67534)).ZP({apiKey:process.env.ANTHROPIC_API_KEY}),c=`You are an AI assistant specialized in creating form specifications in markdown format. Your task is to help users create, modify, and refine forms through conversation.

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

Remember: ALWAYS separate your conversational response from the form markdown by using code blocks. The preview panel will only show the markdown inside the code block.`;async function d(e){try{let{messages:t,currentMarkdown:o}=await e.json(),r=t.map(e=>({role:"user"===e.role?"user":"assistant",content:e.content}));o&&r.push({role:"user",content:`[CONTEXT: Current form markdown:
${o}

Please modify or enhance this based on the user's latest message.]`});let a=(await l.messages.create({model:"claude-3-haiku-20240307",max_tokens:2e3,temperature:.7,system:c,messages:r})).content[0].text,i="",n=a,d=a.match(/```(?:markdown)?\s*\n?([\s\S]*?)```/);if(d)i=d[1].trim(),(n=a.replace(/```(?:markdown)?\s*\n?[\s\S]*?```/g,"").trim())&&!(n.length<5)||(n="✅ I've generated your form! You can see it in the preview panel on the right. Feel free to ask for any modifications.");else if(a.includes("#")&&(a.includes("(text)")||a.includes("(email)")||a.includes("(select)")||a.includes("(textarea)")||a.includes("(checkbox)")||a.includes("(radio)")||a.includes("(number)")||a.includes("(date)")||a.includes("(phone)")||a.includes("(rating)"))){let e=a.split("\n"),t=[],o=[],r=!1,s=!1;for(let a=0;a<e.length;a++){let i=e[a];i.startsWith("#")&&!s?(r=!0,t.push(i)):r&&!s?i.includes("(")||i.includes("*")||i.startsWith("#")||""===i.trim()?t.push(i):(s=!0,o.push(i)):(!r||s)&&o.push(i)}t.length>0&&(i=t.join("\n").trim(),n=o.join("\n").trim()||"✅ I've created your form! Check the preview panel.")}let u=i||o;return s.NextResponse.json({message:n,markdown:u})}catch(t){if(console.error("AI chat error:",t),t.message?.includes("model"))try{let{messages:t}=await e.json(),o=t.filter(e=>"user"===e.role).pop(),r=function(e){let t=e.toLowerCase();return t.includes("contact")||t.includes("get in touch")?`# Contact Form

## Personal Information
What is your name? (text) *
What is your email address? (email) *
What is your phone number? (phone)

## Your Message
What is the subject of your inquiry? (text) *
Please provide details about your inquiry (textarea) *

## Preferences
How would you prefer to be contacted? (radio: Email, Phone, Either) *
Would you like to subscribe to our newsletter? (checkbox: Yes, subscribe me)`:t.includes("feedback")||t.includes("review")?`# Feedback Form

## Your Information
Name (text) *
Email (email) *

## Your Feedback
How would you rate your overall experience? (rating) *
What did you like most? (textarea)
What could we improve? (textarea)

## Follow-up
May we contact you about your feedback? (radio: Yes, No) *`:t.includes("application")||t.includes("job")||t.includes("apply")?`# Job Application Form

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
Salary Expectations (text)`:t.includes("register")||t.includes("registration")||t.includes("sign up")?`# Registration Form

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
Accept Terms and Conditions (checkbox: I accept the terms) *`:`# Custom Form

## Section 1
Question 1 (text) *
Question 2 (email) *
Question 3 (textarea)

## Section 2
Select an option (select: Option 1, Option 2, Option 3) *
Rate your experience (rating)
Additional comments (textarea)

## Confirmation
I confirm the information is accurate (checkbox: Yes) *`}(o?.content||"");return s.NextResponse.json({message:"I've created a basic form structure for you. Feel free to ask me to modify any part of it!",markdown:r})}catch(e){console.error("Fallback error:",e)}return s.NextResponse.json({error:"Failed to generate form. Please try again."},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/ai-form-chat/route",pathname:"/api/ai-form-chat",filename:"route",bundlePath:"app/api/ai-form-chat/route"},resolvedPagePath:"/Users/rosspalmer/Ross GitHub Projects/aloa-web-design-project-manager/app/api/ai-form-chat/route.js",nextConfigOutput:"",userland:r}),{requestAsyncStorage:m,staticGenerationAsyncStorage:p,serverHooks:h}=u,f="/api/ai-form-chat/route";function y(){return(0,n.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:p})}}};var t=require("../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[9276,5972,7534],()=>o(22736));module.exports=r})();