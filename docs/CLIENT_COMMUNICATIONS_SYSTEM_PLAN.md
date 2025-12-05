# Client Communications System: Two-Way Task & Communication Hub

## Executive Summary

This document outlines the design and implementation plan for a **two-way task and communication system** that allows both agency admins and clients to submit tasks, requests, and communications within an ongoing project relationship. Unlike the current milestone-based workflow (which assumes a start-to-end timeline), this system is designed for **perpetual client relationships** where:

1. **Clients can submit requests** with context, uploads, and descriptions via structured forms
2. **Admins can assign tasks to clients** in a beautiful, actionable format (e.g., "Review this document", "Approve this design")
3. **Both sides have a shared inbox/dashboard** with complete visibility of all open items
4. **A paper trail is maintained** for all communications, ensuring nothing gets lost
5. **Client responses are stored** for AI reference and project knowledge (only client-provided content feeds the AI, not admin prompts)

---

## Problem Statement

### Current Limitations

The existing system assumes a **linear project lifecycle**:
- Projects have a start date and completion date
- Applets are assigned in sequential phases (projectlets)
- Once a project is "complete", there's no structured way to continue the relationship

### Real-World Need

Ongoing client relationships require:
- **Continuous task exchange** in both directions
- **No lost requests** - everything tracked and visible
- **Accountability** - who asked for what, when, and what happened
- **Context preservation** - uploads, links, and descriptions attached to requests
- **AI-powered insights** - client responses feed into project knowledge

---

## System Architecture

### Core Concepts

#### 1. Communications Hub
A dedicated page/view per project where both parties can see all active tasks and communications:
- **Client View**: `/project/[projectId]/communications`
- **Admin View**: `/admin/project/[projectId]/communications`

Both views show the same data but with role-appropriate actions.

#### 2. Two-Way Task Types

**Admin → Client Tasks** (`admin_request`)
- Review document
- Approve design
- Provide feedback
- Complete form
- Upload files
- Make decision

**Client → Admin Requests** (`client_request`)
- Request changes
- Report issue
- Ask question
- Submit new requirement
- Request update/status
- General inquiry

#### 3. Unified Communication Thread
Each task/request has its own communication thread:
- Comments from both sides
- File attachments
- Status updates
- All timestamped and attributed

---

## Database Schema

### New Tables

```sql
-- ============================================================
-- Table: aloa_communications
-- Central hub for all bi-directional tasks and requests
-- ============================================================
CREATE TABLE aloa_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    projectlet_id UUID REFERENCES aloa_projectlets(id) ON DELETE SET NULL,
    applet_id UUID REFERENCES aloa_applets(id) ON DELETE SET NULL,

    -- Direction and ownership
    direction TEXT NOT NULL CHECK (direction IN ('admin_to_client', 'client_to_admin')),
    created_by UUID NOT NULL REFERENCES aloa_user_profiles(id),
    assigned_to UUID[] DEFAULT '{}',  -- Can assign to multiple users

    -- Content
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        -- Admin → Client categories
        'review_request',
        'approval_request',
        'feedback_request',
        'document_request',
        'decision_request',
        'action_required',
        -- Client → Admin categories
        'change_request',
        'issue_report',
        'question',
        'new_requirement',
        'status_inquiry',
        'general'
    )),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',           -- Newly created
        'acknowledged',   -- Recipient has seen it
        'in_progress',    -- Work has started
        'pending_review', -- Submitted for review
        'completed',      -- Resolved/done
        'declined',       -- Rejected/not proceeding
        'on_hold'         -- Paused
    )),

    -- Priority and timing
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,

    -- Attachments and metadata
    attachments JSONB DEFAULT '[]',  -- Array of {name, url, type, size}
    form_response_id UUID,           -- If response requires a form
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_communications_project ON aloa_communications(project_id);
CREATE INDEX idx_communications_status ON aloa_communications(status);
CREATE INDEX idx_communications_direction ON aloa_communications(direction);
CREATE INDEX idx_communications_created_by ON aloa_communications(created_by);
CREATE INDEX idx_communications_due_date ON aloa_communications(due_date);

-- ============================================================
-- Table: aloa_communication_messages
-- Thread of messages within each communication item
-- ============================================================
CREATE TABLE aloa_communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES aloa_communications(id) ON DELETE CASCADE,

    -- Author
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id),
    is_admin BOOLEAN NOT NULL,  -- Quick flag for styling

    -- Content
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',  -- Array of {name, url, type, size}

    -- Message type for special formatting
    message_type TEXT DEFAULT 'comment' CHECK (message_type IN (
        'comment',        -- Regular message
        'status_update',  -- System-generated status change
        'attachment',     -- File upload notification
        'mention'         -- Mentions another user
    )),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_comm_messages_communication ON aloa_communication_messages(communication_id);
CREATE INDEX idx_comm_messages_user ON aloa_communication_messages(user_id);

-- ============================================================
-- Table: aloa_communication_read_status
-- Track read/unread status per user
-- ============================================================
CREATE TABLE aloa_communication_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES aloa_communications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,

    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_count INTEGER DEFAULT 0,  -- Count when last read

    UNIQUE(communication_id, user_id)
);

CREATE INDEX idx_comm_read_user ON aloa_communication_read_status(user_id);

-- ============================================================
-- Table: aloa_communication_templates
-- Pre-built templates for common requests
-- ============================================================
CREATE TABLE aloa_communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('admin_to_client', 'client_to_admin')),
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'restricted')),
    category TEXT NOT NULL CHECK (category IN (
        'review_request',
        'approval_request',
        'feedback_request',
        'document_request',
        'decision_request',
        'action_required',
        'change_request',
        'issue_report',
        'question',
        'new_requirement',
        'status_inquiry',
        'general'
    )),

    -- Template content
    default_title TEXT,
    default_description TEXT,
    default_priority TEXT DEFAULT 'medium',

    -- Optional form attachment
    form_id UUID REFERENCES aloa_forms(id),

    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: aloa_communication_template_assignments
-- Optional per-project curation for restricted templates
-- ============================================================
CREATE TABLE aloa_communication_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES aloa_communication_templates(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (template_id, project_id)
);

-- Templates are global by default; set scope = 'restricted' and add assignment rows
-- to curate which projects/clients can see a given template.
```

**Status semantics**: `mark-read` updates `aloa_communication_read_status` and, if the communication is currently `open`, transitions it to `acknowledged` to distinguish between unread vs. seen items.

### RLS Policies

```sql
-- Enable RLS on all new tables
ALTER TABLE aloa_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_communication_template_assignments ENABLE ROW LEVEL SECURITY;

-- Communications: Users can see communications for projects they're members of
CREATE POLICY "Users can view communications for their projects"
ON aloa_communications FOR SELECT
USING (
    project_id IN (
        SELECT project_id FROM aloa_project_members
        WHERE user_id = auth.uid()
    )
    OR
    created_by = auth.uid()
);

-- Admins can create any communication
CREATE POLICY "Admins can create communications"
ON aloa_communications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
    OR
    -- Clients can create client_to_admin communications
    (
        direction = 'client_to_admin'
        AND project_id IN (
            SELECT project_id FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    )
);

-- Users can update communications they created or are assigned to
CREATE POLICY "Users can update relevant communications"
ON aloa_communications FOR UPDATE
USING (
    created_by = auth.uid()
    OR auth.uid() = ANY(assigned_to)
    OR EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Admins can delete communications (soft delete enforced in app layer)
CREATE POLICY "Admins can delete communications"
ON aloa_communications FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Messages: members can read/write, admins override
CREATE POLICY "Users can view messages for their projects"
ON aloa_communication_messages FOR SELECT
USING (
    communication_id IN (
        SELECT id FROM aloa_communications
        WHERE project_id IN (
            SELECT project_id FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert messages for their projects"
ON aloa_communication_messages FOR INSERT
WITH CHECK (
    communication_id IN (
        SELECT id FROM aloa_communications
        WHERE project_id IN (
            SELECT project_id FROM aloa_project_members
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Authors or admins can update messages"
ON aloa_communication_messages FOR UPDATE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin')
    )
);

-- Read status: per-user access only
CREATE POLICY "Users can view their own read status"
ON aloa_communication_read_status FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own read status"
ON aloa_communication_read_status FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
ON aloa_communication_read_status FOR UPDATE
USING (user_id = auth.uid());

-- Templates: admins/team manage, members can read active templates
CREATE POLICY "Project members can read active templates"
ON aloa_communication_templates FOR SELECT
USING (
    is_active = TRUE
    AND (
        scope = 'global'
        OR id IN (
            SELECT template_id FROM aloa_communication_template_assignments
            WHERE project_id IN (
                SELECT project_id FROM aloa_project_members
                WHERE user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Admins can manage templates"
ON aloa_communication_templates FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- Template assignments: admins manage per-project curation
CREATE POLICY "Admins can manage template assignments"
ON aloa_communication_template_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM aloa_user_profiles
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'project_admin', 'team_member')
    )
);

-- Timestamp trigger functions required for updated_at/acknowledged_at/completed_at
```

---

## API Endpoints

### Communications CRUD

```
POST   /api/aloa-projects/[projectId]/communications
       Create new communication (admin or client)
       Body: { title, description, category, direction, assignedTo[], priority, dueDate, attachments[] }

GET    /api/aloa-projects/[projectId]/communications
       List all communications for project
       Query: ?status=open&direction=admin_to_client&page=1&limit=20

GET    /api/aloa-projects/[projectId]/communications/[commId]
       Get single communication with messages

PATCH  /api/aloa-projects/[projectId]/communications/[commId]
       Update communication (status, priority, due date, etc.)
       Body: { status, priority, dueDate, ... }

DELETE /api/aloa-projects/[projectId]/communications/[commId]
       Soft delete (admins only)
```

### Messages

```
POST   /api/aloa-projects/[projectId]/communications/[commId]/messages
       Add message to thread
       Body: { message, attachments[] }

GET    /api/aloa-projects/[projectId]/communications/[commId]/messages
       Get all messages for communication

PATCH  /api/aloa-projects/[projectId]/communications/[commId]/messages/[msgId]
       Edit message (within 15 min window)
       Body: { message }
```

### Aggregates & Notifications

```
GET    /api/aloa-projects/[projectId]/communications/stats
       Get counts by status, unread count, overdue items

GET    /api/aloa-projects/[projectId]/communications/unread
       Get unread communications for current user

POST   /api/aloa-projects/[projectId]/communications/[commId]/mark-read
       Mark communication as read and transition status to acknowledged when currently open
```

---

## UI/UX Design

### Client Communications Page

**Route**: `/project/[projectId]/communications`

```
┌──────────────────────────────────────────────────────────────────┐
│  [← Back to Dashboard]           CLIENT COMMUNICATIONS           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐  ┌─────────────────────────────────┐│
│  │                        │  │                                 ││
│  │  NEW REQUEST           │  │  TABS:                          ││
│  │  [+ Submit Request]    │  │  [From Agency (3)] [My Requests]││
│  │                        │  │                                 ││
│  │  ──────────────────    │  │  ┌─────────────────────────────┐││
│  │                        │  │  │ 🔴 URGENT                   │││
│  │  FILTER BY:            │  │  │ Review Final Logo Options   │││
│  │  ○ All                 │  │  │ Due: Tomorrow               │││
│  │  ○ Open                │  │  │ From: Sarah (Design Lead)   │││
│  │  ○ In Progress         │  │  │ 2 unread messages           │││
│  │  ○ Completed           │  │  └─────────────────────────────┘││
│  │                        │  │                                 ││
│  │  ──────────────────    │  │  ┌─────────────────────────────┐││
│  │                        │  │  │ 🟡 MEDIUM                   │││
│  │  SORT BY:              │  │  │ Approve Homepage Copy       │││
│  │  [Due Date ▼]          │  │  │ Due: Next Week              │││
│  │                        │  │  │ From: Alex (Content)        │││
│  └────────────────────────┘  │  └─────────────────────────────┘││
│                              │                                 ││
│                              │  ┌─────────────────────────────┐││
│                              │  │ ✅ COMPLETED                │││
│                              │  │ Brand Guidelines Review     │││
│                              │  │ Completed: 2 days ago       │││
│                              │  └─────────────────────────────┘││
│                              └─────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Submit Request Modal (Client)

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUBMIT A REQUEST                        [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What type of request is this?                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ 📝        │ │ 🐛        │ │ ❓        │ │ ➕        │       │
│  │ Change    │ │ Issue     │ │ Question  │ │ New       │       │
│  │ Request   │ │ Report    │ │           │ │ Requirement│       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│                                                                 │
│  Title *                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Brief summary of your request                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Description *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │ Provide details about your request...                   │   │
│  │                                                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Attachments                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📎 Drop files here or click to upload                  │   │
│  │     (Images, PDFs, Documents up to 25MB)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [screenshot.png] [requirements.pdf]                            │
│                                                                 │
│  Priority                                                       │
│  ( ) Low  (●) Medium  ( ) High  ( ) Urgent                     │
│                                                                 │
│                           [Cancel]  [Submit Request →]          │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back]          REVIEW FINAL LOGO OPTIONS           [⋮ Menu] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STATUS: 🟡 In Progress    PRIORITY: 🔴 Urgent          │   │
│  │ DUE: Tomorrow at 5:00 PM   CREATED: 2 days ago         │   │
│  │ FROM: Sarah (Design Lead)  ASSIGNED: John (You)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ DESCRIPTION                                             │   │
│  │                                                         │   │
│  │ Please review the attached logo options and let us      │   │
│  │ know which direction you'd like to proceed with.        │   │
│  │                                                         │   │
│  │ We need your decision by tomorrow to stay on schedule.  │   │
│  │                                                         │   │
│  │ Attachments:                                            │   │
│  │ [📎 Logo_Option_A.pdf] [📎 Logo_Option_B.pdf]           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CONVERSATION                                            │   │
│  │ ───────────────────────────────────────────────────────│   │
│  │                                                         │   │
│  │ 👤 Sarah (Agency) · 2 days ago                         │   │
│  │ "Here are the final options based on your feedback!"    │   │
│  │                                                         │   │
│  │ 👤 You · 1 day ago                                     │   │
│  │ "Thanks! I like Option A but can we make the blue      │   │
│  │  slightly darker?"                                      │   │
│  │                                                         │   │
│  │ 👤 Sarah (Agency) · 6 hours ago                        │   │
│  │ "Absolutely! I've updated Option A with a darker blue. │   │
│  │  See attached."                                         │   │
│  │ [📎 Logo_Option_A_v2.pdf]                              │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Add a comment...                                    [📎]│   │
│  └─────────────────────────────────────────────────────────┘   │
│  [Send Message]                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ UPDATE STATUS:                                          │   │
│  │ [Mark as Complete ✓]  [Request Changes]  [Decline]      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Admin Communications Page

**Route**: `/admin/project/[projectId]/communications`

Similar to client view but with additional admin controls:
- Create new admin → client requests
- Assign to specific client users
- Set due dates with calendar picker
- Bulk actions (close all, reassign, etc.)
- Filter by assignee
- Templates for common requests

### Admin Create Request Modal

```
┌─────────────────────────────────────────────────────────────────┐
│                   CREATE CLIENT REQUEST                     [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Use Template (Optional)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [None] ▼                                                │   │
│  │  • Document Review Request                              │   │
│  │  • Design Approval Required                             │   │
│  │  • Feedback Needed                                      │   │
│  │  • Decision Required                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Request Type *                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │ 📋        │ │ ✅        │ │ 💬        │ │ 📄        │       │
│  │ Review    │ │ Approval  │ │ Feedback  │ │ Document  │       │
│  │ Request   │ │ Required  │ │ Request   │ │ Request   │       │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
│  ┌───────────┐ ┌───────────┐                                   │
│  │ 🎯        │ │ ⚡        │                                   │
│  │ Decision  │ │ Action    │                                   │
│  │ Required  │ │ Required  │                                   │
│  └───────────┘ └───────────┘                                   │
│                                                                 │
│  Title *                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Review Final Logo Options                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Description *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Please review the attached logo options and provide     │   │
│  │ your feedback on which direction you prefer...          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Assign To *                                            [+ Add] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [John Smith (Client Admin)] [×]                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Priority          Due Date                                     │
│  [Medium ▼]        [📅 Dec 5, 2025]                            │
│                                                                 │
│  Attachments                                                    │
│  [📎 Drag & drop files here]                                   │
│  [Logo_Option_A.pdf] [Logo_Option_B.pdf]                        │
│                                                                 │
│  Link to Phase/Applet (Optional)                               │
│  [Phase 2: Design ▼] → [Logo Design Applet ▼]                  │
│                                                                 │
│  □ Send email notification to assigned clients                  │
│                                                                 │
│                        [Cancel]  [Create Request →]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### New Components

```
/components
  /communications
    CommunicationsPage.js           # Main page wrapper (both views)
    CommunicationsList.js           # List of communication items
    CommunicationCard.js            # Individual item card
    CommunicationDetail.js          # Full detail view with thread
    CommunicationThread.js          # Message thread component
    MessageInput.js                 # Rich text + attachments input
    CreateRequestModal.js           # Client request creation
    CreateAdminRequestModal.js      # Admin request creation
    StatusBadge.js                  # Status indicator
    PriorityBadge.js                # Priority indicator
    CommunicationFilters.js         # Filter sidebar
    CommunicationStats.js           # Stats summary cards
    TemplateSelector.js             # Template picker for admins
```

### Page Routes

```
/app
  /project/[projectId]
    /communications
      page.js                       # Client communications hub
      [commId]
        page.js                     # Client communication detail
  /admin/project/[projectId]
    /communications
      page.js                       # Admin communications hub
      [commId]
        page.js                     # Admin communication detail
```

---

## Integration Points

### 1. Notification System

When a communication is created or updated:
```javascript
// Auto-trigger notification
await createNotification({
  project_id: projectId,
  user_id: assignedUserId,
  type: direction === 'admin_to_client' ? 'new_task' : 'client_request',
  title: communication.title,
  message: `New ${category} from ${senderName}`,
  data: { communicationId: communication.id }
});
```

### 2. Knowledge Extraction

**IMPORTANT: Only CLIENT-provided content feeds into the AI knowledge system.**

The purpose of the knowledge system is to capture what the client tells us, not what we tell them. Admin questions and requests provide context, but only client responses, answers, and submissions are extracted for AI reference.

```javascript
// In knowledgeExtractor.js
async extractFromCommunication(communication, messages) {
  // Only extract client-authored content
  const clientMessages = messages.filter(m => !m.is_admin);

  // Skip if no client content exists
  if (clientMessages.length === 0 && communication.direction !== 'client_to_admin') {
    return null;
  }

  // For client-initiated requests, include the request itself
  const clientContent = communication.direction === 'client_to_admin'
    ? {
        request_title: communication.title,
        request_description: communication.description,
        request_category: communication.category,
        client_messages: clientMessages.map(m => m.message),
        attachments: communication.attachments
      }
    : {
        // For admin requests, only capture client responses
        client_responses: clientMessages.map(m => ({
          message: m.message,
          attachments: m.attachments,
          timestamp: m.created_at
        }))
      };

  return {
    project_id: communication.project_id,
    source_type: 'communication',
    source_id: communication.id,
    source_name: `Client Response: ${communication.title}`,
    content_type: 'requirements',
    category: this.mapCategoryToKnowledge(communication.category),
    content: JSON.stringify(clientContent),
    content_summary: this.summarizeClientInput(clientContent),
    tags: [communication.category, 'client_response'],
    importance_score: this.priorityToScore(communication.priority)
  };
}
```

**What gets extracted:**
- Client-initiated requests (title, description, attachments)
- Client messages in any thread (responses to admin questions)
- Client file uploads and attachments
- Client status updates and decisions

**What does NOT get extracted:**
- Admin questions and prompts
- Admin-created request descriptions
- Admin messages in threads
- System-generated status updates

Helper functions (`mapCategoryToKnowledge`, `priorityToScore`, `summarizeClientInput`) live in `/lib/knowledge/communicationsExtractor.js` alongside a server-side guard that sets `is_admin` based on the authenticated user’s role and project membership to keep authorship labeling consistent with RLS.
```

### 3. Email Notifications

Configurable email triggers:
- New request assigned → Email to assignee
- Status changed to "complete" → Email to requester
- Message added → Optional email (based on preferences)
- Overdue reminder → Daily digest of overdue items

### 4. Dashboard Integration

**Client Dashboard** (`/project/[projectId]/dashboard`):
- Add "Communications" quick access card
- Show unread count badge
- Show overdue/urgent items

**Admin Dashboard** (`/admin/project/[projectId]`):
- Add "Communications" panel or tab
- Quick action buttons for common requests
- Unread count from clients

---

## Implementation Phases

### Phase 1: Database Foundation (Day 1)
- [x] Create SQL migration file with all tables
- [x] Add RLS policies
- [x] Create database triggers for auto-timestamps (`updated_at` on UPDATE; `acknowledged_at` when status becomes acknowledged; `completed_at` when status becomes completed)
- [ ] Create notification trigger functions
- [x] Test migrations in development

### Phase 2: Core API (Day 1-2)
- [x] Create communications CRUD endpoints
- [x] Create messages endpoints
- [x] Create read status endpoints
- [x] Create stats/aggregation endpoints
- [x] Add authentication checks
- [x] Add knowledge extraction integration

### Phase 3: Client UI (Day 2-3)
- [x] Create CommunicationsPage component
- [ ] Create CommunicationsList with filters
- [x] Create CommunicationCard component
- [x] Create CommunicationDetail with thread
- [x] Create CreateRequestModal (client)
- [x] Create MessageInput component
- [x] Add to client navigation

### Phase 4: Admin UI (Day 3-4)
- [x] Create admin communications page
- [x] Create CreateAdminRequestModal
- [x] Add template system
- [ ] Add bulk actions
- [x] Add assignee management
- [x] Add to admin navigation

### Phase 5: Integration (Day 4-5)
- [x] Connect to notification system
- [x] Add knowledge extraction hooks
- [x] Set up email notifications
- [x] Add dashboard widgets
- [x] Add unread badges to navigation

### Phase 6: Polish (Day 5)
- [ ] Optional: add confetti on completion (feature-flagged)
- [ ] Add optimistic updates
- [ ] Add loading states
- [ ] Add error handling
- [ ] Mobile responsiveness
- [ ] Accessibility review

---

## Success Metrics

### User Experience
- Time to create request < 30 seconds
- Time to acknowledge request < 5 seconds
- Zero lost communications (audit trail)
- Mobile-friendly experience

### System Health
- API response time < 200ms
- Notification delivery < 1 minute
- Knowledge extraction success > 95%
- Zero data loss

### Business Value
- Reduced email volume
- Faster response times
- Complete paper trail
- AI-ready communication history

---

## Future Enhancements

1. **Slack/Teams Integration**: Sync communications to team channels
2. **Smart Templates**: AI-generated templates based on project type
3. **SLA Tracking**: Track response times against targets
4. **Recurring Requests**: Schedule regular check-ins
5. **Approval Workflows**: Multi-step approval chains
6. **Mobile App**: Push notifications and quick actions
7. **AI Summaries**: Weekly digest of communications
8. **Voice Messages**: Record audio messages

---

## File Deliverables

When implementing, create these files:

```
/supabase
  create_communications_tables.sql

/app/api/aloa-projects/[projectId]/communications
  route.js                          # List/create communications
  stats/
    route.js                        # Aggregates and counts
  unread/
    route.js                        # Unread for current user
  [commId]
    route.js                        # Get/update/delete communication
    messages/
      route.js                      # List/create messages
    mark-read/
      route.js                      # Mark as read

/app/project/[projectId]/communications
  page.js                           # Client communications page
  [commId]
    page.js                         # Client communication detail

/app/admin/project/[projectId]/communications
  page.js                           # Admin communications page
  [commId]
    page.js                         # Admin communication detail

/components/communications
  CommunicationsPage.js
  CommunicationsList.js
  CommunicationCard.js
  CommunicationDetail.js
  CommunicationThread.js
  MessageInput.js
  CreateRequestModal.js
  CreateAdminRequestModal.js
  StatusBadge.js
  PriorityBadge.js
  CommunicationFilters.js
  TemplateSelector.js

/lib
  communicationHelpers.js           # Shared utilities
  communicationNotifications.js     # Notification/email helpers

/lib/knowledge
  communicationsExtractor.js        # Knowledge ingestion mapping
```

---

## Conclusion

This two-way communication system transforms the project management platform from a linear milestone tracker into a **perpetual relationship management hub**. By allowing both sides to submit and track requests with full context and history, we ensure:

1. **Nothing gets lost** - Every request is tracked
2. **Complete accountability** - Full paper trail
3. **AI-powered insights** - Client responses feed knowledge system (admin prompts do not)
4. **Beautiful UX** - Consistent with existing design language
5. **Extensible** - Ready for future enhancements

The system leverages existing patterns (applets, notifications, knowledge extraction) while introducing purpose-built infrastructure for bi-directional task management.
