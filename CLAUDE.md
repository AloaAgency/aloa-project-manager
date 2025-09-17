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
- `/auth/*` - Authentication endpoints (login, logout, reset-password, users management)
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

Required in `.env.local` and Vercel Environment Variables:
```env
# Supabase (Required) - Using NEW key format only
# DO NOT use legacy JWT keys that start with "eyJ"
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... # NEW format anon/publishable key
SUPABASE_SECRET_KEY=sb_secret_... # NEW format service role key

# AI Features (Optional)
ANTHROPIC_API_KEY=

# Email Features (Optional)
RESEND_API_KEY=
```

**IMPORTANT**: Supabase has deprecated the old JWT format keys (that start with `eyJ`). We exclusively use the NEW key format:
- Publishable keys start with `sb_publishable_`
- Secret/service role keys start with `sb_secret_`

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

## Authentication System

### Role-Based Access Control
The system implements a hierarchical role-based access control with six user roles:

1. **super_admin** - Full system access, can manage users and all projects
2. **project_admin** - Can manage specific projects and team members
3. **team_member** - Can work on assigned projects with edit permissions
4. **client** - Standard client access to their assigned project dashboard
5. **client_admin** - Client decision-makers who can approve/reject/request revisions on deliverables. They have the final say on client-side decisions
6. **client_participant** - Client team members who can provide opinions (like/dislike work) and fill out forms, but cannot make final decisions. They contribute feedback but don't have approval authority

### Authentication Flow
- Login endpoint: `/api/auth/login`
- Protected routes use `AuthGuard` component to enforce role requirements
- Client users are automatically redirected to their project dashboard upon login
- Non-client users are redirected to the main dashboard

### Client Access
- All client-type users (client, client_admin, client_participant) are assigned to projects via the `aloa_project_members` table with `project_role='viewer'`
- Client dashboard at `/project/[projectId]/dashboard` shows project progress and allows form submissions
- Client roles have different permission levels:
  - **Client Admin**: Can approve/reject deliverables, request revisions, make final decisions
  - **Client Participant**: Can provide feedback, like/dislike work, fill out forms, but cannot make approval decisions
- Clients cannot access admin areas (`/dashboard`, `/admin/*`)

### User Management
- Super admins can manage users at `/admin/users`
- User creation, editing, and deletion available via `/api/auth/users` endpoints
- Password reset functionality with email verification

### Database Tables
- `aloa_user_profiles` - Stores user profile information and roles
- `aloa_project_members` - Links users to projects with specific roles
- `aloa_project_stakeholders` - Additional project stakeholder relationships

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

## Applet Development Guidelines

### CRITICAL: Two-Sided Applet Architecture

**Every applet in the system has TWO sides that must be implemented:**

1. **Admin Side** - `/admin/project/[projectId]/page.js`
   - This is the MAIN admin view where all applet configuration happens
   - Each applet MUST have its basic editing/info available inline on this page
   - No clicking into modals should be required for basic configuration
   - Examples:
     - Form applets: Form selector, statistics, action buttons
     - Link Submission applets: Heading, description, links management
     - All configuration should be editable directly in the projectlet view

2. **Client Side** - `/project/[projectId]/page.js`
   - This is what clients see when viewing the project
   - Read-only presentation of the applet content
   - Interactive elements for client actions (form submissions, acknowledgments, etc.)
   - Must handle client-appropriate display and interactions

### When Adding New Applets

1. **Start with the Admin View** (`/admin/project/[projectId]/page.js`)
   - Add type-specific inline configuration after line ~1443
   - Include all editable fields directly in the projectlet card
   - Use PATCH requests to update applet config in real-time
   - Follow the pattern of existing applets (form, link_submission)

2. **Then implement Client View** (`/project/[projectId]/page.js`)
   - Add client-side rendering for the new applet type
   - Ensure proper read-only display
   - Handle any client interactions

3. **Update ProjectletAppletsManager** (if needed for modal views)
   - This component is used in modals for more detailed configuration
   - Not the primary editing interface - admin page inline editing is primary

### Applet Configuration Pattern

```javascript
// Admin side - inline configuration
{(applet.type === 'your_applet_type') && (
  <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
    {/* All configuration fields here */}
    {/* Direct PATCH calls to update config */}
  </div>
)}

// Client side - read-only display
{applet.type === 'your_applet_type' && (
  <div>
    {/* Client-appropriate display */}
  </div>
)}
```

### Applet Progress Tracking Standards

**CRITICAL: ALL applets MUST use the standardized progress tracking system via `aloa_applet_progress` table.**

#### Core Progress Fields (Required for ALL Applet Types)
- `started_at` - Timestamp when user first interacts with applet
- `completed_at` - Timestamp when user completes the applet
- `status` - Current state: 'not_started', 'in_progress', 'completed', 'approved'
- `completion_percentage` - 0-100 scale (0=not started, 50=in progress, 100=completed)

#### Progress Tracking Implementation
1. **Use the `update_applet_progress` stored procedure** - Never directly update the table
2. **Call the procedure via `/api/aloa-projects/[projectId]/client-view` POST endpoint**
3. **Status transitions:**
   - `not_started` → `in_progress` (sets `started_at` if null)
   - `in_progress` → `completed` (sets `completed_at`)
   - `completed` → `in_progress` (clears `completed_at` for re-editing)

#### Client Dashboard Button States
The client dashboard automatically displays appropriate button states based on progress:
- **No progress record** → "Start →"
- **`started_at` set, no `completed_at`** → "Resume →"
- **`completed_at` set, unlocked** → Shows pencil icon for editing
- **`completed_at` set, locked** → Shows eye icon for viewing only

#### Avatar Display States
- **Completed** - Solid border ring around avatar
- **In Progress** - Dotted/dashed border ring around avatar (opacity 80%)
- **Not Started** - No avatar shown

### Applet Locking Mechanism

Many applet types support a locking feature that controls client interaction:

**When Unlocked:**
- Clients can submit new responses or edit existing ones
- Clicking the pencil icon loads their previous response pre-populated
- Saving overwrites the previous entry (no duplicate submissions from same user)
- Forms display with interactive fields and submit buttons

**When Locked:**
- Clients can only view their submitted responses
- No editing or new submissions allowed
- Forms display in read-only mode without action buttons
- Useful for finalizing data collection phases

**Implementation Pattern:**
- Lock status stored in `applet.config.locked` (boolean)
- Admin controls lock/unlock via toggle in `/admin/project/[projectId]/page.js`
- Client view checks lock status to determine interaction mode
- Standard functionality across form, palette_cleanser, and future applet types

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