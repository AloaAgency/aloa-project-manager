# Custom Forms - Next.js Application

A beautiful form builder that transforms markdown files into shareable forms with unique URLs.

## Features

- **Upload Markdown Files**: Create forms from `.md` files
- **AI-Powered Form Builder**: Create forms through natural language chat with AI
- **Beautiful Aloa-Inspired Design**: Modern black and cream aesthetic
- **Unique URLs**: Each form gets a shareable URL
- **Response Collection**: Store and manage form submissions
- **AI Response Analysis**: Analyze form responses with AI insights
- **PDF Export for Analysis**: Download AI analysis as professional PDF reports
- **Email Analysis Reports**: Send beautifully formatted analysis reports via email
- **Email Notifications**: Automatic email alerts for new submissions
- **Form Progress Persistence**: Auto-saves form progress locally
- **Multi-Step Forms**: Support for sectioned forms with step navigation
- **CSV Export**: Export responses for analysis
- **Dashboard**: Central management for all forms
- **Field Types**: Text, email, number, textarea, select, radio, checkbox, multiselect, rating, date, time, file, tel, url

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with custom Aloa color scheme
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Optimized for Vercel
- **UI Components**: React Hook Form, React Dropzone, Framer Motion
- **Icons**: Lucide React
- **AI**: Anthropic Claude API
- **Email Service**: Resend
- **PDF Generation**: jsPDF

## Prerequisites

- Node.js 18+
- Supabase account (free tier available)

## Local Development

### 1. Clone the Repository

```bash
git clone <repository-url>
cd custom-forms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Markdown Format

Create forms using this markdown structure:

```markdown
# Form Title
Description of your form

## Field Label *
Type: text|email|number|textarea|select|radio|checkbox|date|time|tel|url|file
Placeholder: Optional placeholder text
Min: 10 (optional - min value or min length)
Max: 100 (optional - max value or max length)
  - Option 1 (for select/radio/checkbox)
  - Option 2
  - Option 3
```

### Field Types

- `text` - Single line text input
- `email` - Email input with validation
- `number` - Numeric input
- `tel` - Phone number input
- `url` - URL input
- `textarea` - Multi-line text area
- `select` - Dropdown selection
- `radio` - Radio buttons (single choice)
- `checkbox` - Checkboxes (multiple choices)
- `multiselect` - Multiple selection dropdown
- `rating` - Star rating (1-5 stars by default)
- `date` - Date picker
- `time` - Time picker
- `file` - File upload

Add `*` after the field label to make it required.

### Example Form

```markdown
# Contact Form
Please fill out this form to get in touch.

## Name *
Type: text
Placeholder: Your full name

## Email *
Type: email
Placeholder: your@email.com

## Phone
Type: tel
Placeholder: (555) 123-4567

## Subject *
Type: select
  - General Inquiry
  - Support Request
  - Partnership
  - Other

## Message *
Type: textarea
Placeholder: Your message here...
Min: 10
Max: 500

## Preferred Contact Method *
Type: radio
  - Email
  - Phone
  - Either

## Subscribe to Newsletter
Type: checkbox
  - Yes, I want to receive updates

## How satisfied are you? *
Type: rating
Max: 5

## Select your interests
Type: multiselect
  - Technology
  - Design
  - Marketing
  - Business
  - Other
```

### Multi-Step Forms

Create multi-step forms by adding section headers:

```markdown
# Registration Form
Complete all steps to register

## Section: Personal Information

## First Name *
Type: text

## Last Name *
Type: text

## Section: Contact Details

## Email *
Type: email

## Phone
Type: tel
```

## Deployment to Vercel

### 1. Prepare for Deployment

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL from `supabase-schema.sql` file to create tables
4. Get your project URL and anon key from Settings → API

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" and import your repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click "Deploy"

### 4. Verify Deployment

Once deployed, Vercel will provide you with a URL. Visit the URL to ensure:
- The home page loads
- You can create forms
- Forms can be submitted
- Responses are stored in MongoDB

## Project Structure

```
custom-forms/
├── app/
│   ├── api/              # API routes
│   │   ├── forms/        # Form endpoints
│   │   └── responses/    # Response endpoints
│   ├── create/           # Form creation page
│   ├── dashboard/        # Dashboard page
│   ├── forms/            # Form display pages
│   ├── responses/        # Response viewing pages
│   ├── globals.css       # Global styles
│   ├── layout.js         # Root layout
│   └── page.js           # Home page
├── lib/
│   ├── supabase.js        # Supabase client
│   └── markdownParser.js # Markdown parsing
├── public/               # Static assets
├── .env.example          # Environment variables template
├── next.config.js        # Next.js configuration
├── package.json          # Dependencies
├── tailwind.config.js    # Tailwind configuration
└── vercel.json           # Vercel configuration
```

## API Routes

### Forms
- `POST /api/forms/upload` - Upload markdown file to create form
- `GET /api/forms` - Get all forms with response counts
- `GET /api/forms/[urlId]` - Get form by URL ID
- `GET /api/forms/by-id/[formId]` - Get form by database ID
- `DELETE /api/forms/[formId]` - Delete form and its responses

### AI Analysis
- `GET /api/ai-analysis/[formId]` - Get cached AI analysis
- `POST /api/ai-analysis/[formId]` - Generate new AI analysis
- `POST /api/ai-analysis/[formId]/pdf` - Validate PDF generation data
- `POST /api/ai-analysis/[formId]/email` - Send analysis report via email

### Responses
- `POST /api/responses` - Submit form response
- `GET /api/responses?formId=[id]` - Get responses for a form

### AI Features

The application includes AI-powered features:

1. **AI Form Builder**: Access via `/create` page, chat with AI to generate forms
2. **AI Response Analysis**: View insights on `/ai-analysis/[formId]` page with:
   - Executive summary and key metrics
   - Consensus and divergence areas identification
   - Actionable recommendations with priority levels
   - Stakeholder messaging
3. **AI Analysis Export Options**:
   - **PDF Download**: Generate client-facing PDF reports with professional formatting
   - **Email Reports**: Send analysis via email with customizable recipients and subject
4. **Email Notifications**: Automatic emails sent for new form submissions

### Form Progress Persistence

Forms automatically save progress to browser localStorage:
- Progress saved on every field change
- Restored when user returns to form
- Cleared on successful submission
- Works across browser sessions

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |
| `ANTHROPIC_API_KEY` | Claude AI API key (optional) | `sk-ant-...` |
| `RESEND_API_KEY` | Resend email API key (optional) | `re_...` |
| `EMAIL_FROM` | From address for emails | `forms@example.com` |
| `EMAIL_TO` | Notification recipient | `admin@example.com` |

## Troubleshooting

### Supabase Connection Issues
- Ensure you've run the SQL schema in your Supabase project
- Verify the project URL and anon key are correct
- Check that Row Level Security policies are properly configured

### Form Not Found
- Verify the URL ID is correct
- Check MongoDB connection is working
- Ensure form was created successfully

### Vercel Deployment Fails
- Check build logs for errors
- Verify all dependencies are in package.json
- Ensure environment variables are set correctly

## License

MIT

## Contributing

Pull requests are welcome! Please follow the existing code style and add tests for new features.