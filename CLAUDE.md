# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A gamified project management system specifically for Aloa web design projects. Built on Next.js 14, it guides clients through a structured workflow using forms, milestones, and projectlets with progress tracking and gamification elements. The system maintains backward compatibility with the original form builder while introducing project-specific features.

## Development Commands

```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Next.js linting
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with custom Aloa color scheme (black/cream aesthetic)
- **AI**: Anthropic Claude API for form generation and response analysis
- **Email**: Resend for notifications and reports
- **PDF**: jsPDF for report generation

### Database Schema

The application uses Supabase with the following core tables:
- `forms`: Stores form definitions with JSONB fields structure
- `responses`: Stores form submissions linked to forms
- Additional migration files in `/migrations/` for schema updates

### API Structure

All API routes are in `/app/api/`:
- `/forms/*` - Form CRUD operations
- `/responses/*` - Response management
- `/ai-analysis/*` - AI analysis generation and export
- `/ai-form-chat` - AI-powered form builder chat
- `/projects/*` - Project management endpoints

### Key Libraries
- `@supabase/supabase-js` - Database client
- `@anthropic-ai/sdk` - Claude AI integration
- `react-hook-form` - Form handling
- `framer-motion` - Animations
- `react-dropzone` - File uploads
- `resend` - Email service

## Environment Variables

Required in `.env.local`:
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# AI Features (Optional)
ANTHROPIC_API_KEY=

# Email Features (Optional)
RESEND_API_KEY=
```

## Markdown Form DSL

Forms use a custom markdown format parsed by `/lib/markdownParser.js`:

```markdown
# Form Title
Description text

## Section: Section Name  # Creates multi-step form

## Field Label *          # * = required
Type: text|email|number|textarea|select|radio|checkbox|date|time|tel|url|file|rating|multiselect
Placeholder: Optional text
Min: 10                   # Min value/length
Max: 100                  # Max value/length
  - Option 1              # For select/radio/checkbox
  - Option 2
```

## Key Features Implementation

### Form Creation Flow
1. User uploads markdown or uses AI chat at `/create`
2. Markdown parsed to JSON structure
3. Form saved to Supabase with unique URL ID
4. Shareable link generated at `/forms/[urlId]`

### Response Collection
1. Forms auto-save progress to localStorage
2. Submissions stored in Supabase
3. Email notifications sent (if configured)
4. Responses viewable at `/responses/[formId]`

### AI Analysis
1. Analysis generated via `/api/ai-analysis/[formId]`
2. Cached in database for performance
3. Exportable as PDF or email report
4. Includes executive summary, metrics, recommendations

## Database Migrations

**IMPORTANT**: All SQL migration files should be placed in the `/supabase` folder for organization and easy access. This allows users to quickly find and run SQL scripts in the Supabase SQL editor.

Apply migrations in order from `/supabase/`:
1. Run base schema from `supabase-schema.sql` (original forms system)
2. Run `aloa_project_management_schema.sql` (new aloa_ prefixed tables - no conflicts!)
3. Run `migrate_existing_forms_to_aloa.sql` (backup and migration utilities)
4. Apply any additional feature migrations

When creating new SQL files, always save them to `/supabase/` folder, not `/migrations/`

### New Aloa Tables (all prefixed with aloa_ to avoid conflicts):
- `aloa_projects` - Main project container
- `aloa_projectlets` - Mini-projects within projects
- `aloa_project_forms` - Project-specific forms
- `aloa_project_responses` - Form responses
- `aloa_project_timeline` - Event tracking
- `aloa_project_team` - Team members and permissions
- `aloa_project_files` - File storage
- `aloa_notification_queue` - Email reminders
- `aloa_project_achievements` - Gamification

## Testing

Backend parser tests available in `/backend/test-*.js` files. No frontend test suite currently configured.

## Deployment

Optimized for Vercel deployment:
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy (automatic builds on push)

## Common Development Tasks

### Adding New Field Types
1. Update parser in `/lib/markdownParser.js`
2. Add rendering logic in `/app/forms/[urlId]/FormClient.js`
3. Update validation as needed

### Modifying Email Templates
1. Templates in `/lib/emailTemplates.js`
2. Email sending logic in API routes

### Updating AI Prompts
1. Form generation prompts in `/app/api/ai-form-chat/route.js`
2. Analysis prompts in `/app/api/ai-analysis/[formId]/route.js`