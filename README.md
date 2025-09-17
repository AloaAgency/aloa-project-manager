# Aloa Project Manager 🚀

A gamified project management system specifically designed for Aloa web design projects. Built with Next.js 14, it guides clients through a structured workflow using forms, milestones, and projectlets with progress tracking and gamification elements.

## Features

### Authentication & User Management
- **Controlled Access**: No open signup - all users must be provisioned by admins
- **Role-Based Access Control**: Four distinct roles with specific permissions:
  - **Super Admin**: Full system access, user management, all projects
  - **Project Admin**: Manage specific projects and team members
  - **Team Member**: Access to assigned projects with edit capabilities
  - **Client**: View-only access to their specific project dashboard
- **User Provisioning**: Super admins can create users directly or send email invitations
- **Project Assignment**: Clients can be assigned to specific projects
- **Secure API Access**: All sensitive operations use service role keys

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

### Applet System & Admin Interface
- **Collapsed View Display**: All applets display completion avatars in the collapsed view (right side, next to trash icon)
- **Clickable Avatars**: Standard behavior - clicking any completion avatar opens a modal showing that user's submitted data
  - Form applets: Shows the user's form responses
  - Palette Cleanser applets: Shows the user's palette preferences
  - Sitemap applets: Shows the user's submitted sitemap structure
- **Visual Status Indicators**:
  - Solid ring: Completed submission
  - Dashed ring: In-progress submission
- **Clean Interface**: Applets remain collapsed with inline configuration when expanded
- **Consistent UX**: All applet types follow the same interaction pattern for viewing user submissions

### Enhanced File Repository
- **Hierarchical Folder Structure**: Create nested folders to organize project files
- **Drag & Drop File Management**: Move files between folders with intuitive drag and drop
- **Image Previews**: Visual grid view with thumbnails for image files
- **Right-Click Context Menu**: Quick access to rename files and folders
- **Multiple Navigation Methods**: Breadcrumbs, folder clicks, and parent folder drops
- **Real-time File Counting**: Automatic updates to file counts in Knowledge Base
- **Selective File Presentation**: Attach specific files to upload applets for client viewing
- **Public Storage Configuration**: Properly configured Supabase storage with RLS policies

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
-- 1. SKIP legacy schema - DO NOT RUN supabase-schema.sql

-- 2. Aloa project management tables (REQUIRED)
migrations/aloa_project_management_schema.sql

-- 3. Applets system for modular projectlet components (REQUIRED)
migrations/add_applets_system.sql

-- 4. Project knowledge base for AI context
migrations/add_project_knowledge_base.sql

-- 5. User-specific applet progress tracking (REQUIRED)
migrations/add-user-applet-progress.sql

-- 6. Optional: Add form status fields for closing/reopening
migrations/add_form_status_fields.sql

-- 7. REQUIRED: Add user_id to track multi-stakeholder form responses
migrations/add_user_id_to_responses.sql

-- 8. User management and authentication (REQUIRED)
supabase/create_or_update_aloa_user_profiles.sql
supabase/user_invitations_table.sql
supabase/create_aloa_project_stakeholders_table.sql

-- 9. CRITICAL FIX: Disable RLS on user profiles to prevent infinite recursion
supabase/completely_fix_aloa_user_profiles.sql

-- 10. File Repository: Add folder support and enhanced file management
supabase/add_folder_support_to_files.sql

-- 11. Storage Configuration: Create and configure public storage bucket
supabase/create_storage_bucket.sql
supabase/fix_storage_bucket.sql
```

**IMPORTANT**: Only use tables with `aloa_` prefix. Never reference or create tables without this prefix.

**⚠️ SECURITY NOTE**: Row Level Security (RLS) is currently disabled on `aloa_user_profiles` table to prevent infinite recursion issues. Security is handled at the API level using Supabase service role keys. This should be re-enabled in the future with properly designed non-recursive policies.

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

### Initial Setup (Super Admin)
1. First user to register becomes super admin (ross@aloa.agency is pre-configured)
2. Navigate to `/admin/users` to manage users
3. Create project admin and team member accounts
4. Create client accounts and assign them to projects

### Creating a New Project
1. Navigate to `/project-setup`
2. Fill in project details (client, timeline, scope)
3. Submit to initialize the project
4. Assign client users to the project via `/admin/users`

### User Management
- **Super Admins**: Access `/admin/users` to:
  - Create new users with specific roles
  - Send email invitations
  - Assign clients to projects
  - Edit user roles and permissions
  - Delete user accounts

### Client Dashboard
- Clients login to see only their assigned project
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
- Control user access and permissions

## Database Structure

**CRITICAL: All tables and fields MUST use the `aloa_` prefix. Never use or reference the old database structure without this prefix.**

### Current Database Tables (ALWAYS USE THESE):
- `aloa_projects` - Main project container
- `aloa_projectlets` - Mini-projects/tasks
- `aloa_applets` - Modular components within projectlets
- `aloa_applet_library` - Reusable applet templates
- `aloa_applet_interactions` - Tracking applet interactions
- `aloa_applet_progress` - User-specific applet progress tracking
- `aloa_forms` - Form definitions (NOT forms table)
- `aloa_form_fields` - Form field definitions (NOT form_fields)
- `aloa_form_responses` - Form submissions (NOT responses)
- `aloa_form_response_answers` - Individual form answers
- `aloa_project_forms` - Link forms to projects
- `aloa_project_timeline` - Event tracking
- `aloa_project_team` - Team members
- `aloa_project_stakeholders` - Client-project associations
- `aloa_project_documents` - Project files and deliverables
- `aloa_project_files` - Enhanced file repository with folder support
- `aloa_project_knowledge` - AI knowledge base
- `aloa_project_insights` - AI-generated insights
- `aloa_user_profiles` - User profiles and roles (⚠️ RLS disabled)
- `user_invitations` - Pending user invitations

### Important Field Naming Conventions:
- Form fields use: `field_name`, `field_label`, `field_type` (NOT name, label, type)
- Forms use: `url_id` (NOT urlId)
- Project references: `aloa_project_id` (NOT project_id)
- Form references: `aloa_form_id` (NOT form_id)

### Legacy Tables (DO NOT USE):
- ❌ `forms` - Old form system, replaced by `aloa_forms`
- ❌ `responses` - Old responses, replaced by `aloa_form_responses`
- ❌ Any table without `aloa_` prefix

## API Routes

### Authentication & User Management
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/profile` - Get current user profile
- `GET /api/auth/users` - List all users (super admin only)
- `POST /api/auth/users` - Create new user (super admin only)
- `PATCH /api/auth/users` - Update user (super admin only)
- `DELETE /api/auth/users` - Delete user (super admin only)
- `POST /api/auth/users/invite` - Send user invitation (super admin only)
- `POST /api/auth/users/assign-project` - Assign user to project (super admin only)
- `DELETE /api/auth/users/assign-project` - Remove user from project (super admin only)

### Project Management
- `POST /api/aloa-projects/initialize` - Create new project
- `GET /api/aloa-projects/[projectId]` - Get project details
- `GET /api/aloa-projects/[projectId]/projectlets` - Get projectlets
- `PATCH /api/aloa-projects/[projectId]/projectlets` - Update status

### File Repository
- `GET /api/project-files` - List files and folders
- `POST /api/project-files` - Upload files or create folders
- `PATCH /api/project-files` - Rename files or folders
- `DELETE /api/project-files` - Delete files or folders
- `PUT /api/project-files` - Move files between folders

### Form Management APIs (ALWAYS USE ALOA_ ENDPOINTS)
- `/api/aloa-forms/*` - Form CRUD operations (uses aloa_forms table)
- `/api/aloa-responses/*` - Form response management (uses aloa_form_responses table)
- `/api/aloa-projects/[projectId]/client-view` - Client dashboard data with user progress

### Legacy APIs (DEPRECATED - DO NOT USE)
- ❌ `/api/forms/*` - Old form system, do not use
- ❌ `/api/responses/*` - Old response system, do not use

## Development Best Practices

### ⚠️ Preventing Regressions When Adding New Applets

When developing new applet types, follow these guidelines to avoid breaking existing functionality:

#### 1. File Handling Standards
- **Always use underscored property names**: `file_name`, `file_size`, `file_url` (NOT `fileName`, `size`, `url`)
- **Check multiple storage locations**: Files can be in `config.files`, `config.attached_files`, or `aloa_project_files` table
- **Add null checks**: Always check if properties exist before using methods like `.split()` or `.toLowerCase()`
- **Handle API response formats**: Support both array responses and `{ files: [...] }` object responses

#### 2. Progress Tracking Standards
- **Use standardized progress system**: All applets MUST use `aloa_applet_progress` table
- **Update via stored procedure**: Call `update_applet_progress` through `/api/aloa-projects/[projectId]/client-view`
- **Track key timestamps**: Always set `started_at` and `completed_at` appropriately
- **Button state logic**: "Start" → "Resume" → "Edit/View" based on progress timestamps

#### 3. Testing Checklist Before Committing
Before pushing any new applet work:
- [ ] Test File Repository still loads without errors
- [ ] Test existing upload applets (Pig/Agency Upload) still display files
- [ ] Test Palette Cleanser shows correct button states
- [ ] Test file sizes display correctly (not 0 bytes)
- [ ] Test both admin and client dashboards for runtime errors
- [ ] Check browser console for any JavaScript errors

#### 4. Common Pitfalls to Avoid
- Don't assume file properties exist - always use fallbacks
- Don't hardcode property names - use consistent naming across components
- Don't modify shared components without testing all usages
- Don't change API response formats without updating all consumers

### Development Commands

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

### 🔧 File Handling Fixes & Improvements
- **Fixed File Upload Applets**: Restored functionality for Pig/Agency Upload applets to display attached files correctly
- **Fixed Palette Cleanser**: Now properly shows "Resume" button for in-progress users instead of "Start"
- **Fixed File Repository**: Resolved "Failed to load files" error with proper API response handling
- **Fixed File Size Display**: Files now show correct sizes instead of 0 bytes
- **Unified File Property Access**: Standardized to use `file_name` and `file_size` (with underscores) across all components
- **Improved Null Handling**: Added comprehensive null checks to prevent `fileName.split()` runtime errors
- **API Response Flexibility**: Components now handle both array and object response formats from file APIs

### 📁 Enhanced File Repository System
- **Hierarchical Folder Structure**: Create and manage nested folders for better file organization
- **Drag & Drop File Management**: Intuitive drag and drop to move files between folders
- **Image Preview Support**: Visual grid view with thumbnails for all image files
- **Right-Click Context Menu**: Quick rename functionality for files and folders
- **Real-time File Counting**: Automatic updates to file counts in Knowledge Base section
- **Selective File Presentation**: Attach specific files to upload applets for client viewing
- **Storage Configuration**: Properly configured Supabase storage bucket with public access and RLS policies
- **Multiple Navigation**: Breadcrumb navigation, folder clicks, and parent folder drops
- **File Upload Applet Integration**: Working ability to select and attach specific files for presentation

### 🔒 Authentication & User Management System
- **Controlled User Access**: Removed open signup - all users must be provisioned by admins
- **Role-Based Access Control**: Implemented four-tier permission system
- **User Management Dashboard**: Super admins can create, edit, and delete users at `/admin/users`
- **Email Invitations**: Send invitations with Resend integration for new users
- **Project Assignment**: Assign clients to specific projects with restricted access
- **Secure API Endpoints**: All user management APIs require super admin authentication
- **RLS Temporarily Disabled**: Fixed infinite recursion issue by disabling RLS on `aloa_user_profiles`

### 🔥 Critical Database Migration
- **IMPORTANT**: All database interactions now use `aloa_` prefixed tables and fields
- **User Profiles Table**: Added `aloa_user_profiles` for authentication and roles
- **Project Stakeholders**: Added `aloa_project_stakeholders` for client-project associations
- **User Invitations**: Added `user_invitations` table for invitation system
- **User Progress Tracking**: Added `aloa_applet_progress` table for individual client tracking
- **Form Response Linking**: Form responses now properly link to projects via `aloa_project_id`
- **Field Name Consistency**: All form fields use `field_name`, `field_label`, etc. (not `name`, `label`)

### 🎉 New Features
- **User Management Page**: Complete admin interface for managing system users
- **Client Form Modal**: Integrated multi-step form rendering in client dashboard
- **Form Progress Saving**: Automatic saving of partial form completions
- **Enhanced Form Parsing**: Improved markdown parsing for pipe-delimited format
- **Multiselect Field Support**: Added support for multiselect form fields

### 🐛 Bug Fixes
- Fixed infinite recursion in RLS policies for user profiles
- Fixed authentication flow and role detection
- Fixed form modal display in client dashboard
- Fixed dropdown z-index issues in modal overlays
- Fixed multiselect/checkbox field rendering and state management
- Fixed form parsing to properly separate labels from placeholders
- Fixed options parsing for select, radio, checkbox, and multiselect fields
- Resolved runtime errors with form creation
- **Fixed database field references to use aloa_ prefix consistently**
- **Fixed response viewer to use aloa_form_fields structure**
- **Fixed form submission to include project ID linkage**
- **Added user-specific progress tracking for multi-client support**
- **Fixed client dashboard project journey display (corrected table reference)**
- **Fixed image preview URLs with proper Supabase storage configuration**
- **Fixed file upload applet to allow selective file attachment**

## Previous Updates (December 2024)

### 🎉 Features Added
- **Form Applets**: Create forms with AI directly from projectlets
- **Inline Projectlet Management**: Edit names and descriptions without navigation
- **Drag & Drop Reordering**: Reorganize projectlets with visual feedback
- **Project Knowledge Base**: AI learns from your project documents
- **Applet Library**: Pre-built templates for common project tasks
- **Quick Actions**: Add projectlets and applets without leaving the view

### 🐛 Fixes Applied
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
│   ├── AIChatFormBuilder.js         # AI form creation
│   ├── EnhancedFileRepository.js    # File repository with folders
│   ├── ClientFileRepository.js      # Client-side file viewer
│   ├── FileUploadConfigWithSelector.js # File selection for applets
│   └── FileUploadConfigStorage.js   # File upload configuration
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