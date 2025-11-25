# Form Markdown Reference Guide
Complete reference for creating forms compatible with the Aloa Form Builder.

## Section: Basic Structure

The form must start with a title using a single `#` header. This is REQUIRED.
An optional description follows the title on the next lines (before any sections).

## Section: Field Format (Recommended)

Use the pipe-delimited format for maximum compatibility:
`- type* | field_id | Label Text | Placeholder text...`

### Format Breakdown:
- `type` = The field type (see "Supported Field Types" section below)
- `*` after type = Makes the field required (optional)
- `field_id` = Unique snake_case identifier for the field
- `Label Text` = The question or label shown to users
- `Placeholder text` = Helper text shown in the input (optional)

## Section: Supported Field Types

### Text Input Fields:
- `text` - Single line text input
- `email` - Email address with validation
- `phone` or `tel` - Phone number input
- `url` - Website URL with validation
- `number` - Numeric input (supports Min/Max validation)
- `date` - Date picker
- `textarea` or `multiline` - Multi-line text area

### Selection Fields:
- `select` - Dropdown menu (single selection)
- `radio` - Radio buttons (single selection, all options visible)
- `checkbox` - Checkboxes (multiple selections allowed)
- `multiselect` - Multi-select dropdown

### Special Fields:
- `rating` - 1-5 star rating
- `file` - File upload

## Section: Adding Options to Selection Fields

For select, radio, checkbox, and multiselect fields, add options on indented lines:
```
- select* | referral | How did you hear about us?
  - Google Search
  - Social Media
  - Friend or Colleague
  - Other
```

Options must be indented with exactly 2 spaces and start with `- `

## Section: Validation Properties

Add validation on separate lines after a field (using the alternate format):

```
## Field Label *
Type: number
Min: 1
Max: 100
Placeholder: Enter a number between 1-100

## Another Field
Type: text
Min: 10
Max: 500
Pattern: ^[A-Za-z]+$
```

- `Min:` = Minimum value (for numbers) or minimum length (for text)
- `Max:` = Maximum value (for numbers) or maximum length (for text)
- `Pattern:` = Regular expression for validation

---

# EXAMPLE: Complete Contact Form
This is an example of a fully-featured contact form.

## Section: Personal Information
- text* | full_name | What is your full name? | Enter your full name...
- email* | email_address | What is your email address? | you@example.com
- phone | phone_number | What is your phone number? | (555) 123-4567
- url | website | Do you have a website? | https://yoursite.com

## Section: About Your Project
- select* | project_type | What type of project is this?
  - New Website
  - Website Redesign
  - Mobile App
  - E-commerce Store
  - Other
- number | budget | What is your estimated budget? | Enter amount in USD
- date | deadline | When do you need this completed?
- textarea* | project_description | Please describe your project in detail | Tell us about your goals, requirements, and vision...

## Section: Preferences
- radio* | contact_method | How would you prefer to be contacted?
  - Email
  - Phone Call
  - Video Call
  - Text Message
- multiselect | services_needed | Which services are you interested in?
  - Web Design
  - Web Development
  - Branding
  - SEO
  - Content Writing
  - Ongoing Maintenance
- rating | urgency | How urgent is this project?
- checkbox | agreements | Please confirm the following:
  - I agree to the terms of service
  - I would like to receive updates via email

## Section: Additional Information
- textarea | additional_notes | Any additional notes or questions? | Anything else we should know...

---

# EXAMPLE: Job Application Form
A comprehensive job application form.

## Section: Applicant Information
- text* | applicant_name | Full Legal Name | First and Last Name
- email* | applicant_email | Email Address | you@example.com
- phone* | applicant_phone | Phone Number | (555) 123-4567
- text* | current_location | Current City and State | e.g., New York, NY

## Section: Professional Background
- text | current_employer | Current/Most Recent Employer | Company name
- text | current_title | Current/Most Recent Job Title | Your role
- number* | years_experience | Years of Professional Experience | Total years
- url | linkedin_url | LinkedIn Profile URL | https://linkedin.com/in/yourprofile
- url | portfolio_url | Portfolio or Personal Website | https://yourportfolio.com

## Section: Position Details
- select* | position_applying | Position You're Applying For
  - Software Engineer
  - Product Manager
  - UX Designer
  - Marketing Manager
  - Sales Representative
  - Customer Success
  - Other
- select* | work_arrangement | Preferred Work Arrangement
  - Remote Only
  - Hybrid (Some Days in Office)
  - On-Site Only
  - Flexible / No Preference
- date* | earliest_start | Earliest Available Start Date
- text | salary_expectation | Salary Expectations | e.g., $80,000 - $100,000

## Section: Application Questions
- textarea* | why_interested | Why are you interested in this position? | Minimum 100 words...
- textarea* | relevant_experience | Describe your most relevant experience for this role | Specific examples preferred...
- textarea | unique_skills | What unique skills or perspectives would you bring to our team? | Optional but recommended...

## Section: References
- radio* | references_available | Can you provide professional references?
  - Yes, immediately
  - Yes, upon request
  - No
- checkbox* | confirmations | Please confirm:
  - I certify that all information provided is accurate
  - I authorize verification of this information

---

# EXAMPLE: Customer Feedback Form
Collect valuable feedback from customers.

## Section: Your Experience
- rating* | overall_satisfaction | How satisfied are you with our service overall?
- rating* | product_quality | How would you rate our product quality?
- rating | customer_service | How would you rate our customer service?
- rating | value_for_money | How would you rate the value for money?

## Section: Detailed Feedback
- radio* | would_recommend | How likely are you to recommend us to others?
  - Definitely would recommend
  - Probably would recommend
  - Not sure
  - Probably would not recommend
  - Definitely would not recommend
- textarea | liked_most | What did you like most about your experience? | Tell us what we did well...
- textarea | improvements | What could we improve? | Your suggestions help us get better...

## Section: About You (Optional)
- text | customer_name | Your Name | Optional
- email | customer_email | Your Email | Optional - for follow-up only
- checkbox | follow_up | Would you like us to follow up?
  - Yes, please contact me about my feedback

---

# ALTERNATE FORMAT: Inline Syntax

This format is also supported but the pipe-delimited format is preferred:

## Section: Example Section
What is your name? (text) *
What is your email? (email) *
Your phone number (phone)
Rate our service (rating) *
Your feedback (textarea)
Preferred contact method (select: Email, Phone, Text) *
Subscribe to newsletter? (checkbox: Yes, sign me up)

---

# TIPS FOR LLMs GENERATING FORMS

1. ALWAYS start with `# Form Title` - this is mandatory
2. Use `## Section: Name` to organize fields into logical groups
3. Use snake_case for field IDs (e.g., full_name, email_address)
4. Mark required fields with `*` after the type
5. Provide helpful placeholder text that guides users
6. Group related fields into sections
7. Use appropriate field types (email for emails, phone for phones, etc.)
8. For selection fields, provide 3-6 clear options
9. Use rating fields for satisfaction/experience questions
10. Use textarea for open-ended questions requiring detailed responses

# QUICK REFERENCE

```
# Form Title
Optional description text

## Section: Section Name
- type* | field_id | Label | Placeholder
- type | field_id | Label | Placeholder
- select* | field_id | Label
  - Option 1
  - Option 2
  - Option 3
```

Field Types: text, email, phone/tel, url, number, date, textarea, select, radio, checkbox, multiselect, rating, file
