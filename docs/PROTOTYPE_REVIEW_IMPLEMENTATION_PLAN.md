# Prototype Viewer with Commenting Feature - Implementation Plan

**Document Version:** 1.0
**Date:** November 3, 2025
**Author:** Claude Code Analysis
**Project:** aloa-project-manager

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Markup.io Feature Breakdown](#markupio-feature-breakdown)
3. [Technical Architecture Recommendation](#technical-architecture-recommendation)
4. [Database Schema Design](#database-schema-design)
5. [API Endpoints Specification](#api-endpoints-specification)
6. [Component Structure](#component-structure)
7. [Phase-by-Phase Implementation Roadmap](#phase-by-phase-implementation-roadmap)
8. [Risk Assessment & Mitigation Strategies](#risk-assessment--mitigation-strategies)

---

## Executive Summary

### Overview
This document outlines a comprehensive plan to build a prototype viewer with commenting capabilities for the Aloa Project Manager, inspired by markup.io's functionality. The feature will allow clients and team members to view prototypes, mockups, and live websites with the ability to add visual comments, annotations, and feedback directly on the page.

### Core Objectives
- **Enable Visual Feedback**: Allow stakeholders to place comments directly on prototypes and websites
- **Streamline Design Review**: Centralize feedback in context rather than scattered across emails
- **Maintain Project Context**: Integrate seamlessly with existing projectlet/applet system
- **Support Multiple Sources**: Handle both external URLs (client's current site) and uploaded images/prototypes
- **Respect User Hierarchy**: Leverage existing stakeholder importance scoring system
- **Real-time Collaboration**: Multiple users can view and comment simultaneously

### Key Benefits
- **Reduced Feedback Loop Time**: Visual comments eliminate ambiguity
- **Centralized Communication**: All feedback lives in one place
- **Audit Trail**: Complete history of design decisions and revisions
- **Client Engagement**: Intuitive interface encourages thorough feedback
- **Knowledge Capture**: Comments feed into the project knowledge system for AI context

### Integration Points
This feature integrates with existing Aloa systems:
- **Projectlet/Applet System**: New "Prototype Review" applet type
- **Project Knowledge System**: Comment content becomes searchable knowledge
- **Stakeholder Importance Scoring**: Comments weighted by user importance
- **Progress Tracking**: Uses standard `aloa_applet_progress` table
- **File Repository**: Uploaded prototypes stored in existing file system
- **AI Context**: Feedback feeds AI agents for better recommendations

---

## Markup.io Feature Breakdown

### Core Features Observed

#### 1. **Multi-Format Support**
- **Websites**: Enter any URL to create an annotatable version
- **Images**: Upload static mockups, wireframes, designs
- **PDFs**: Annotate multi-page documents
- **Videos**: Frame-specific comments (future enhancement)

#### 2. **Visual Commenting System**
- **Pin Placement**: Click anywhere on the page to drop a comment marker
- **Numbered Markers**: Sequential numbering for easy reference
- **Comment Threads**: Reply to comments, creating conversations
- **@Mentions**: Tag team members to notify them
- **Status Tracking**: Mark comments as resolved/unresolved

#### 3. **Collaboration Features**
- **Multi-User Access**: Share a link to invite collaborators
- **Guest Access**: No account required for basic commenting (we'll require accounts)
- **Real-time Updates**: See when others are viewing/commenting
- **Notification System**: Email alerts for new comments and replies

#### 4. **Browser Extension**
- **Chrome Extension**: Annotate any website directly from browser
- **Screenshot Capture**: Automatically includes screenshots with comments
- **Context Preservation**: Maintains original page state

#### 5. **Device Views**
- **Responsive Preview**: Desktop, tablet, mobile views
- **Device Switching**: Test responsiveness without leaving tool
- **Viewport Simulation**: Accurate device dimensions

#### 6. **Organization Features**
- **Projects**: Group related prototypes
- **Version Control**: Track multiple iterations
- **Filter/Search**: Find specific comments or feedback
- **Export Options**: Download comments as reports

### User Experience Flow

1. **Admin creates prototype review applet**
   - Enters prototype URL or uploads image
   - Sets review parameters (deadline, required reviewers)
   - Configures permissions (who can comment)

2. **Client receives notification**
   - Opens project dashboard
   - Sees new "Prototype Review" applet
   - Clicks to enter review mode

3. **Client reviews prototype**
   - Views prototype in iframe or image viewer
   - Clicks anywhere to add comment marker
   - Types feedback in comment popup
   - Can add follow-up replies to existing comments
   - Marks comments as critical/important

4. **Team receives feedback**
   - Notifications sent when comments added
   - Admin views all comments in organized list
   - Can reply to comments, mark as resolved
   - Export feedback report for development team

5. **Knowledge extraction**
   - All comments analyzed for design preferences
   - Feedback categorized (design, functionality, content)
   - Patterns identified across stakeholders
   - AI context updated with insights

---

## Technical Architecture Recommendation

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                           │
│                                                             │
│  ┌──────────────────┐        ┌──────────────────┐         │
│  │  React Component │◄──────►│  Comment Overlay │         │
│  │  (Prototype      │        │  (Markers & UI)  │         │
│  │   Viewer)        │        │                  │         │
│  └────────┬─────────┘        └──────────────────┘         │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Layer                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Prototype   │  │  Comments    │  │  Screenshot  │    │
│  │  API         │  │  API         │  │  API         │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Layer                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  PostgreSQL  │  │  Storage     │  │  Realtime    │    │
│  │  (Comments,  │  │  (Images,    │  │  (Live       │    │
│  │   Prototypes)│  │   Files)     │  │   Updates)   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Decisions

#### 1. **Prototype Viewing Strategy**

**Option A: Proxy-based Approach (Recommended for MVP)**
- Store URL in database
- Display prototype in controlled iframe
- Overlay transparent div for capturing clicks
- **Pros**: Simple to implement, no CORS issues for capture
- **Cons**: Limited to same-origin or CORS-friendly sites

**Option B: Screenshot-based Approach (Recommended for Production)**
- Use html2canvas (already in package.json) to capture full page
- Store screenshot in Supabase Storage
- Display image with annotation layer
- **Pros**: No CORS issues, consistent experience, works offline
- **Cons**: Not live/interactive, larger storage requirements

**Option C: Browser Extension Approach (Future Enhancement)**
- Chrome extension injects annotation layer
- Captures current page state
- Sends data back to Aloa system
- **Pros**: Works on any site, live preview
- **Cons**: Requires extension installation, complex to build

**Recommendation**: Start with **Option B (Screenshot)** for MVP because:
- Already have html2canvas in dependencies
- No cross-origin restrictions
- Simpler permission model
- Consistent across all users
- Can add Option A (iframe) for same-origin sites in Phase 2

#### 2. **Comment Positioning System**

**Coordinate Storage Strategy**:
```javascript
// Store comments with multiple coordinate systems
{
  "position": {
    "x": 450,              // Absolute X from left edge
    "y": 320,              // Absolute Y from top edge
    "percentX": 45.2,      // Percentage-based X (responsive)
    "percentY": 28.4,      // Percentage-based Y (responsive)
    "viewport": {
      "width": 1920,       // Original viewport width
      "height": 1080       // Original viewport height
    },
    "element": {           // Optional: DOM selector (for iframe mode)
      "selector": ".header > nav",
      "xOffset": 20,
      "yOffset": 15
    }
  }
}
```

**Positioning Algorithm**:
1. **Screenshot Mode**: Use percentage-based coordinates
   - Calculate: `percentX = (clickX / imageWidth) * 100`
   - Render: `markerX = (percentX / 100) * currentWidth`
   - Scales perfectly with responsive design

2. **Iframe Mode** (Phase 2): Use CSS selectors + offsets
   - Store XPath or CSS selector of clicked element
   - Store offset from element origin
   - Recalculate position on viewport resize

#### 3. **Real-time vs Polling**

**Recommendation: Polling for MVP, Supabase Realtime for Production**

- **MVP (Polling)**:
  - Check for new comments every 10 seconds
  - Simple to implement, no WebSocket complexity
  - Good enough for async feedback workflow

- **Production (Supabase Realtime)**:
  - Subscribe to PostgreSQL changes via Supabase Realtime
  - Live cursor indicators showing who's viewing
  - Instant comment updates
  - Already available in Supabase stack

#### 4. **Permission & Access Control**

Leverage existing RLS (Row Level Security) system:
- Comments inherit project permissions
- Stakeholder importance scores determine comment weight
- Client admin can mark comments as "decision"
- Regular clients provide "input" comments

---

## Database Schema Design

### New Tables

#### 1. `aloa_prototypes`
Stores prototype/mockup metadata and URL/file references.

```sql
CREATE TABLE aloa_prototypes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES aloa_projects(id) ON DELETE CASCADE,
  applet_id UUID REFERENCES aloa_applets(id) ON DELETE CASCADE,

  -- Prototype metadata
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'superseded'

  -- Source information
  source_type TEXT NOT NULL, -- 'url', 'screenshot', 'upload'
  source_url TEXT, -- Original URL if type = 'url'
  screenshot_url TEXT, -- Supabase storage path to screenshot
  file_url TEXT, -- Supabase storage path for uploaded images

  -- Viewport metadata (for responsive rendering)
  viewport_width INTEGER DEFAULT 1920,
  viewport_height INTEGER DEFAULT 1080,
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'tablet', 'mobile'

  -- Review settings
  review_deadline TIMESTAMP WITH TIME ZONE,
  requires_approval BOOLEAN DEFAULT false,
  min_reviewers INTEGER DEFAULT 1,

  -- Statistics
  total_comments INTEGER DEFAULT 0,
  resolved_comments INTEGER DEFAULT 0,
  unresolved_comments INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES aloa_user_profiles(id)
);

-- Indexes for performance
CREATE INDEX idx_prototypes_project ON aloa_prototypes(project_id);
CREATE INDEX idx_prototypes_applet ON aloa_prototypes(applet_id);
CREATE INDEX idx_prototypes_status ON aloa_prototypes(status);
```

#### 2. `aloa_prototype_comments`
Stores individual comments/annotations on prototypes.

```sql
CREATE TABLE aloa_prototype_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prototype_id UUID NOT NULL REFERENCES aloa_prototypes(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES aloa_prototype_comments(id) ON DELETE CASCADE,

  -- Comment content
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'feedback', -- 'feedback', 'question', 'issue', 'praise'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'

  -- Position data (stored as JSONB for flexibility)
  position JSONB NOT NULL,
  /* Example position structure:
  {
    "x": 450,
    "y": 320,
    "percentX": 45.2,
    "percentY": 28.4,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "element": {
      "selector": ".header",
      "xOffset": 20,
      "yOffset": 15
    }
  }
  */

  -- Visual marker data
  marker_number INTEGER, -- Sequential number for UI (1, 2, 3...)
  marker_color TEXT DEFAULT '#3B82F6', -- Hex color for marker

  -- Status tracking
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'wont_fix', 'duplicate'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES aloa_user_profiles(id),

  -- User data
  created_by UUID NOT NULL REFERENCES aloa_user_profiles(id),
  stakeholder_importance INTEGER DEFAULT 5, -- From stakeholder scoring system

  -- Thread data
  is_thread_root BOOLEAN DEFAULT true, -- false if reply to another comment
  thread_root_id UUID, -- Points to root comment if this is a reply
  reply_count INTEGER DEFAULT 0,

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  mentioned_users UUID[], -- Array of user IDs mentioned with @

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_comments_prototype ON aloa_prototype_comments(prototype_id);
CREATE INDEX idx_comments_parent ON aloa_prototype_comments(parent_comment_id);
CREATE INDEX idx_comments_user ON aloa_prototype_comments(created_by);
CREATE INDEX idx_comments_status ON aloa_prototype_comments(status);
CREATE INDEX idx_comments_thread_root ON aloa_prototype_comments(thread_root_id);

-- Index for position queries (GiST for JSONB)
CREATE INDEX idx_comments_position ON aloa_prototype_comments USING GIN (position);
```

#### 3. `aloa_prototype_versions`
Track changes to prototypes over time.

```sql
CREATE TABLE aloa_prototype_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prototype_id UUID NOT NULL REFERENCES aloa_prototypes(id) ON DELETE CASCADE,

  version_number TEXT NOT NULL,
  description TEXT,

  -- Snapshot data
  screenshot_url TEXT,
  source_url TEXT,

  -- Changes from previous version
  changes_summary TEXT,
  previous_version_id UUID REFERENCES aloa_prototype_versions(id),

  -- Statistics at this version
  snapshot_comments_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES aloa_user_profiles(id)
);

CREATE INDEX idx_versions_prototype ON aloa_prototype_versions(prototype_id);
```

#### 4. `aloa_prototype_comment_likes`
Track who liked which comments.

```sql
CREATE TABLE aloa_prototype_comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES aloa_prototype_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate likes
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_likes_comment ON aloa_prototype_comment_likes(comment_id);
CREATE INDEX idx_likes_user ON aloa_prototype_comment_likes(user_id);
```

### Database Functions

#### Auto-update Comment Counts
```sql
-- Trigger function to update comment counts
CREATE OR REPLACE FUNCTION update_prototype_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE aloa_prototypes
    SET total_comments = total_comments + 1,
        unresolved_comments = CASE
          WHEN NEW.status = 'open' THEN unresolved_comments + 1
          ELSE unresolved_comments
        END
    WHERE id = NEW.prototype_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      UPDATE aloa_prototypes
      SET resolved_comments = CASE
            WHEN NEW.status = 'resolved' THEN resolved_comments + 1
            WHEN OLD.status = 'resolved' THEN resolved_comments - 1
            ELSE resolved_comments
          END,
          unresolved_comments = CASE
            WHEN NEW.status = 'open' THEN unresolved_comments + 1
            WHEN OLD.status = 'open' THEN unresolved_comments - 1
            ELSE unresolved_comments
          END
      WHERE id = NEW.prototype_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE aloa_prototypes
    SET total_comments = total_comments - 1,
        unresolved_comments = CASE
          WHEN OLD.status = 'open' THEN unresolved_comments - 1
          ELSE unresolved_comments
        END,
        resolved_comments = CASE
          WHEN OLD.status = 'resolved' THEN resolved_comments - 1
          ELSE resolved_comments
        END
    WHERE id = OLD.prototype_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_counts
AFTER INSERT OR UPDATE OR DELETE ON aloa_prototype_comments
FOR EACH ROW EXECUTE FUNCTION update_prototype_comment_counts();
```

#### Update Reply Counts
```sql
CREATE OR REPLACE FUNCTION update_reply_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE aloa_prototype_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE aloa_prototype_comments
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_comment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reply_counts
AFTER INSERT OR DELETE ON aloa_prototype_comments
FOR EACH ROW EXECUTE FUNCTION update_reply_counts();
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all new tables
ALTER TABLE aloa_prototypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_prototype_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_prototype_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE aloa_prototype_comment_likes ENABLE ROW LEVEL SECURITY;

-- Prototypes: Users can view if they're project members
CREATE POLICY "Users can view prototypes for their projects"
ON aloa_prototypes FOR SELECT
USING (
  project_id IN (
    SELECT aloa_project_id FROM aloa_project_stakeholders
    WHERE user_id = auth.uid()
  )
);

-- Prototypes: Only admins can create/update/delete
CREATE POLICY "Admins can manage prototypes"
ON aloa_prototypes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM aloa_user_profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'project_admin', 'team_member')
  )
);

-- Comments: Users can view comments on prototypes they can access
CREATE POLICY "Users can view comments on accessible prototypes"
ON aloa_prototype_comments FOR SELECT
USING (
  prototype_id IN (
    SELECT p.id FROM aloa_prototypes p
    WHERE p.project_id IN (
      SELECT aloa_project_id FROM aloa_project_stakeholders
      WHERE user_id = auth.uid()
    )
  )
);

-- Comments: Users can create comments on accessible prototypes
CREATE POLICY "Users can create comments"
ON aloa_prototype_comments FOR INSERT
WITH CHECK (
  prototype_id IN (
    SELECT p.id FROM aloa_prototypes p
    WHERE p.project_id IN (
      SELECT aloa_project_id FROM aloa_project_stakeholders
      WHERE user_id = auth.uid()
    )
  )
  AND created_by = auth.uid()
);

-- Comments: Users can update/delete their own comments
CREATE POLICY "Users can manage their own comments"
ON aloa_prototype_comments FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON aloa_prototype_comments FOR DELETE
USING (created_by = auth.uid());

-- Comment Likes: Users can view all likes
CREATE POLICY "Users can view likes"
ON aloa_prototype_comment_likes FOR SELECT
USING (true);

-- Comment Likes: Users can add their own likes
CREATE POLICY "Users can add likes"
ON aloa_prototype_comment_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Comment Likes: Users can remove their own likes
CREATE POLICY "Users can remove their likes"
ON aloa_prototype_comment_likes FOR DELETE
USING (user_id = auth.uid());
```

---

## API Endpoints Specification

### Base Path: `/api/aloa-projects/[projectId]/prototypes`

#### 1. **GET `/api/aloa-projects/[projectId]/prototypes`**
List all prototypes for a project.

**Request:**
```javascript
GET /api/aloa-projects/abc123/prototypes?appletId=xyz789&status=active
```

**Response:**
```json
{
  "success": true,
  "prototypes": [
    {
      "id": "proto-1",
      "projectId": "abc123",
      "appletId": "xyz789",
      "name": "Homepage Mockup - Version 2",
      "screenshotUrl": "https://storage.supabase.co/...",
      "totalComments": 12,
      "unresolvedComments": 4,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ]
}
```

#### 2. **POST `/api/aloa-projects/[projectId]/prototypes`**
Create a new prototype.

**Request:**
```json
{
  "appletId": "xyz789",
  "name": "Homepage Mockup",
  "sourceType": "upload",
  "viewportWidth": 1920,
  "viewportHeight": 1080
}
```

#### 3. **GET `/api/aloa-projects/[projectId]/prototypes/[prototypeId]/comments`**
Get all comments for a prototype.

**Response:**
```json
{
  "success": true,
  "comments": [
    {
      "id": "comment-1",
      "commentText": "Can we make this header bigger?",
      "position": {
        "percentX": 23.4,
        "percentY": 11.1
      },
      "markerNumber": 1,
      "status": "open",
      "createdBy": {
        "fullName": "John Client",
        "stakeholderImportance": 9
      },
      "replies": []
    }
  ]
}
```

#### 4. **POST `/api/aloa-projects/[projectId]/prototypes/[prototypeId]/comments`**
Create a new comment.

**Request:**
```json
{
  "commentText": "This section needs more contrast",
  "priority": "high",
  "position": {
    "x": 640,
    "y": 480,
    "percentX": 33.3,
    "percentY": 44.4
  }
}
```

---

## Component Structure

### Frontend Components

#### 1. **`PrototypeReviewApplet.js`**
Main applet component (dual-sided: admin & client).

**Admin View Features:**
- Upload prototype or enter URL
- Configure review settings
- View all comments in organized list
- Mark comments as resolved

**Client View Features:**
- View prototype in full screen
- Add comments by clicking on image
- Reply to existing comments
- Filter comments by status/priority

#### 2. **`PrototypeViewer.js`**
Core viewer with comment overlay system.

**Features:**
- Responsive image container
- Click-to-comment overlay
- Comment marker rendering
- Zoom and pan controls

#### 3. **`CommentMarker.js`**
Individual comment marker/pin component.

**Visual States:**
- Default: Blue circle with number
- High Priority: Red/orange circle
- Resolved: Green circle with checkmark
- Selected: Larger with pulsing animation

#### 4. **`CommentThread.js`**
Comment detail panel with replies.

**Features:**
- Original comment display
- Nested replies
- Reply input field
- Like button
- Resolve button (admins only)

#### 5. **`CommentSidebar.js`**
Sidebar showing all comments in list view.

**Features:**
- Filterable comment list
- Sort options
- Quick jump to comment marker
- Search comments

---

## Phase-by-Phase Implementation Roadmap

### Phase 1: Foundation & Basic Viewer (Week 1)
**Goal:** Basic prototype viewing without comments

#### Tasks:
- [ ] Create database migration for `aloa_prototypes` table
- [ ] Add `prototype_review` to applet system
- [ ] Create API route for prototype CRUD
- [ ] Build basic `PrototypeViewer.js` component
- [ ] Implement file upload to Supabase Storage

**Deliverable:** Admins can upload prototypes, clients can view them

---

### Phase 2: Comment Placement System (Week 2)
**Goal:** Click-to-comment functionality with visual markers

#### Tasks:
- [ ] Create `aloa_prototype_comments` table
- [ ] Build comment API endpoints
- [ ] Create click-to-comment overlay
- [ ] Build `CommentMarker.js` component
- [ ] Implement percentage-based positioning

**Deliverable:** Users can click on prototype to add comments, see numbered markers

---

### Phase 3: Comment Threading & Interactions (Week 3)
**Goal:** View, reply, and interact with comments

#### Tasks:
- [ ] Create `CommentThread.js` component
- [ ] Implement nested reply system
- [ ] Build `CommentSidebar.js`
- [ ] Add like/unlike functionality
- [ ] Implement edit/delete permissions

**Deliverable:** Full comment threading with likes, replies, edit/delete

---

### Phase 4: Status Management & Notifications (Week 4)
**Goal:** Comment resolution and user notifications

#### Tasks:
- [ ] Add "Resolve" functionality
- [ ] Update marker visuals for resolved comments
- [ ] Integrate with `aloa_applet_progress`
- [ ] Build email notification system
- [ ] Add @mention notifications

**Deliverable:** Comment resolution workflow with email notifications

---

### Phase 5: Screenshot Capture & URL Prototypes (Week 5)
**Goal:** Automatically capture screenshots from URLs

#### Tasks:
- [ ] Create screenshot capture API
- [ ] Implement html2canvas server-side
- [ ] Build background job system
- [ ] Add URL input UI
- [ ] Implement viewport options

**Deliverable:** Automatic screenshot capture from URLs

---

### Phase 6: Knowledge Extraction & AI Integration (Week 6)
**Goal:** Feed comments into project knowledge system

#### Tasks:
- [ ] Update knowledge extractor for prototype comments
- [ ] Categorize comments by type
- [ ] Weight by stakeholder importance
- [ ] Integrate with Project Insights Chat
- [ ] Generate AI summaries

**Deliverable:** All prototype feedback becomes searchable knowledge

---

### Phase 7: Advanced Features & Polish (Week 7)
**Goal:** Enhanced UX and professional polish

#### Tasks:
- [ ] Add version control system
- [ ] Build export functionality (PDF/CSV)
- [ ] Add keyboard shortcuts
- [ ] Mobile optimization
- [ ] Performance optimization

**Deliverable:** Production-ready prototype review system

---

### Phase 8: Real-time Features (Optional)
**Goal:** Live collaboration and presence indicators

#### Tasks:
- [ ] Supabase Realtime setup
- [ ] Live comment updates
- [ ] Presence indicators
- [ ] Collaborative features

**Deliverable:** Real-time collaborative prototype review

---

## Risk Assessment & Mitigation Strategies

### Technical Risks

#### Risk 1: Cross-Origin Iframe Restrictions
**Severity:** HIGH
**Probability:** HIGH

**Mitigation:**
- Use screenshot-based approach (recommended)
- Avoid iframe for external sites
- Clear communication to users about limitations

#### Risk 2: Comment Positioning on Responsive Designs
**Severity:** MEDIUM
**Probability:** MEDIUM

**Mitigation:**
- Percentage-based positioning
- Store viewport metadata
- Display warning if viewport differs

#### Risk 3: Screenshot Capture Failures
**Severity:** MEDIUM
**Probability:** MEDIUM

**Mitigation:**
- Graceful error handling
- Manual upload fallback
- Alternative capture methods (Puppeteer)

#### Risk 4: Performance with Large Numbers of Comments
**Severity:** LOW
**Probability:** MEDIUM

**Mitigation:**
- Database indexes
- Pagination
- Virtualized comment list
- Lazy loading

### Security Risks

#### Risk 5: Unauthorized Access to Prototypes
**Severity:** HIGH
**Probability:** LOW

**Mitigation:**
- Row Level Security (RLS) policies
- Access logging
- Regular security audits

#### Risk 6: XSS via Comment Content
**Severity:** MEDIUM
**Probability:** LOW

**Mitigation:**
- Input sanitization with DOMPurify
- Store plain text only
- Content Security Policy headers

---

## Success Metrics

### MVP Success Criteria (Phases 1-2)
- [ ] Admins can upload 3+ prototypes without errors
- [ ] Clients can add comments successfully 95%+ of time
- [ ] Comment markers render accurately across devices
- [ ] Page load time < 3 seconds for 50 comments
- [ ] Zero security vulnerabilities

### Production Success Criteria (Phases 3-7)
- [ ] 80%+ of clients use prototype review vs email
- [ ] Average time to resolve comment < 24 hours
- [ ] Client satisfaction score 4.5/5 or higher
- [ ] Screenshot capture success rate 90%+
- [ ] Lighthouse performance score 90+

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 1 week | Basic prototype viewer |
| Phase 2 | 1 week | Click-to-comment working |
| Phase 3 | 1 week | Full threading & interactions |
| Phase 4 | 1 week | Resolution & notifications |
| Phase 5 | 1 week | Screenshot capture |
| Phase 6 | 1 week | AI knowledge integration |
| Phase 7 | 1 week | Polish & production ready |
| **Total** | **7 weeks** | **Production-ready system** |

---

## Next Steps

1. Review this plan with stakeholders
2. Prioritize phases based on business needs
3. Create GitHub project board for tracking
4. Begin Phase 1 implementation
5. Schedule check-ins after each phase

---

*Document prepared by Claude Code - November 3, 2025*
