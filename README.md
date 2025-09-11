# Aloa Project Manager 🚀

A gamified project management system specifically designed for Aloa web design projects. Built with Next.js 14, it guides clients through a structured workflow using forms, milestones, and projectlets with progress tracking and gamification elements.

## Features

### Core Project Management
- **Structured Workflow**: Proven path from contract to launch
- **Projectlet System**: Sequential mini-projects that unlock as you progress
- **Applet System**: Modular components within projectlets (forms, content blocks, approvals)
- **Gamified Progress**: Achievements, progress bars, and milestone celebrations
- **Client Dashboard**: Real-time project status and progress tracking
- **Team Management**: Role-based access for clients, designers, developers

### Advanced Projectlet Management
- **Inline Editing**: Edit projectlet names and descriptions directly in the UI
- **Drag & Drop Reordering**: Reorganize projectlets by dragging
- **Real-time Updates**: All changes save automatically
- **Quick Actions**: Add projectlets and applets without leaving the management view
- **Applet Library**: Pre-built applet templates for common tasks

### Smart Forms & Content Collection
- **AI-Powered Form Builder**: Create forms with project-specific context
- **Project Knowledge Base**: AI learns from project documents and insights
- **Design Inspiration Forms**: Mood boards, fonts, color palettes
- **Content Forms**: Homepage briefs, page content collection
- **Site Structure Builder**: Interactive sitemap creation
- **Approval Workflows**: Client review and approval tracking
- **Form Applets**: Integrate forms directly into projectlets with automatic attachment

### Project Tracking
- **Timeline Management**: Automatic deadline tracking and reminders
- **Progress Visualization**: Percentage complete, stats, achievements
- **Email Notifications**: Automated updates for deadlines and milestones
- **Activity Timeline**: Complete history of project events
- **Knowledge Base System**: Document and insight storage for AI context

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons, Framer Motion
- **Email**: Resend (optional)
- **AI**: Anthropic Claude API (optional)

## Installation

### Prerequisites
- Node.js 18+
- Supabase account

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd aloa-web-design-project-manager
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key

# Optional
ANTHROPIC_API_KEY=your-anthropic-key
RESEND_API_KEY=your-resend-key
```

4. **Set up database**

Run these SQL files in your Supabase SQL editor in order:
```sql
-- 1. Base schema (if you need the legacy forms system)
migrations/supabase-schema.sql

-- 2. Aloa project management tables (required)
migrations/aloa_project_management_schema.sql

-- 3. Applets system for modular projectlet components
migrations/add_applets_system.sql

-- 4. Project knowledge base for AI context
migrations/add_project_knowledge_base.sql

-- 5. Optional: Add form status fields for closing/reopening
migrations/add_form_status_fields.sql
```

5. **Start development server**
```bash
npm run dev
```

Visit http://localhost:3000

## Project Workflow

The system guides projects through these phases:

### 1. Initialize
- Contract signing
- Project setup
- Timeline definition
- Team assignment

### 2. Discover
- Design inspiration survey
- Mood board selection
- Font selection
- Color palette choice

### 3. Create
- Homepage content brief
- Copy creation
- Design mockups
- Site structure planning
- Individual page content

### 4. Deliver
- Design review & approval
- Development phase
- Revisions
- Final launch

## Usage

### Creating a New Project
1. Navigate to `/project-setup`
2. Fill in project details (client, timeline, scope)
3. Submit to initialize the project
4. Client receives access to their dashboard

### Client Dashboard
- View overall progress
- Access available projectlets
- Submit forms
- Track achievements
- Review timeline

### Admin Features
- Manage multiple projects
- Update projectlet status
- Upload deliverables
- Track team progress

## Database Structure

All tables use `aloa_` prefix to avoid conflicts:
- `aloa_projects` - Main project container
- `aloa_projectlets` - Mini-projects/tasks
- `aloa_project_forms` - Form definitions
- `aloa_project_responses` - Form submissions
- `aloa_project_timeline` - Event tracking
- `aloa_project_team` - Team members
- `aloa_project_files` - Deliverables
- `aloa_notification_queue` - Email reminders
- `aloa_project_achievements` - Gamification

## API Routes

### Project Management
- `POST /api/aloa-projects/initialize` - Create new project
- `GET /api/aloa-projects/[projectId]` - Get project details
- `GET /api/aloa-projects/[projectId]/projectlets` - Get projectlets
- `PATCH /api/aloa-projects/[projectId]/projectlets` - Update status

### Legacy Form System (maintained for compatibility)
- `/api/forms/*` - Original form CRUD operations
- `/api/responses/*` - Form response management

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run linting
```

## Deployment

Optimized for Vercel:
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

## Recent Updates (December 2024)

### 🎉 New Features
- **Form Applets**: Create forms with AI directly from projectlets
- **Inline Projectlet Management**: Edit names and descriptions without navigation
- **Drag & Drop Reordering**: Reorganize projectlets with visual feedback
- **Project Knowledge Base**: AI learns from your project documents
- **Applet Library**: Pre-built templates for common project tasks
- **Quick Actions**: Add projectlets and applets without leaving the view

### 🐛 Bug Fixes
- Fixed syntax errors in project admin page
- Made "+ Add Projectlet" button functional
- Improved applet modal workflow

## Project Structure

```
aloa-project-manager/
├── app/
│   ├── api/
│   │   ├── aloa-projects/    # Project management APIs
│   │   └── aloa-applets/     # Applet library API
│   ├── admin/
│   │   └── project/
│   │       └── [projectId]/  # Project management UI
│   ├── project/
│   │   └── [projectId]/
│   │       └── dashboard/     # Client dashboard
│   ├── project-setup/         # Project initialization
│   ├── create/                # AI form builder
│   └── page.js                # Home page
├── components/
│   ├── ProjectletAppletsManager.js  # Applet management
│   └── AIChatFormBuilder.js         # AI form creation
├── lib/
│   └── supabase.js           # Database client
└── migrations/                # SQL schemas
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Private - Aloa Agency

## Support

For questions or issues, contact the Aloa development team.