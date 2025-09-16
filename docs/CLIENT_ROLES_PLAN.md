# Two-Tier Client Role System Implementation Plan

## Overview
Implement two distinct client role types to provide granular control over client-side permissions and interactions within projects.

## New Role Structure

### Current Roles (4)
1. `super_admin` - Full system access
2. `project_admin` - Project management access
3. `team_member` - Project work access
4. `client` - Client view access (TO BE SPLIT)

### Proposed Roles (5)
1. `super_admin` - Full system access
2. `project_admin` - Project management access
3. `team_member` - Project work access
4. **`client_admin`** - Primary client decision maker
5. **`client_participant`** - Secondary client stakeholder

## Role Definitions

### Client Admin
**Purpose**: Primary client contact with decision-making authority

**Capabilities**:
- ✅ View full project dashboard
- ✅ Submit all forms
- ✅ Approve/reject deliverables
- ✅ View work submitted by other client participants
- ✅ Access and manage project files
- ✅ Make final decisions on design choices
- ✅ View project timeline and milestones
- ✅ Communicate with agency team
- ✅ Invite other client participants (optional)
- ✅ View analytics and reports

**Restrictions**:
- ❌ Cannot access admin areas
- ❌ Cannot modify project structure
- ❌ Cannot edit projectlets/applets
- ❌ Cannot access other projects

### Client Participant
**Purpose**: Secondary stakeholders who provide input but don't make final decisions

**Capabilities**:
- ✅ View project dashboard (limited view)
- ✅ Submit assigned forms
- ✅ View project progress
- ✅ Rate/react to work (thumbs up/down)
- ✅ Leave comments on deliverables
- ✅ View approved designs
- ✅ Access shared project files (read-only)

**Restrictions**:
- ❌ Cannot approve/reject deliverables
- ❌ Cannot make final decisions
- ❌ Cannot see other participants' form submissions
- ❌ Cannot access admin areas
- ❌ Cannot upload files (only view)
- ❌ Cannot edit project details
- ❌ Limited communication with agency

## Implementation Tasks

### 1. Database Schema Updates

```sql
-- Update aloa_user_profiles role enum
ALTER TYPE user_role ADD VALUE 'client_admin' AFTER 'team_member';
ALTER TYPE user_role ADD VALUE 'client_participant' AFTER 'client_admin';

-- Add participant permissions table
CREATE TABLE aloa_participant_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  can_submit_forms BOOLEAN DEFAULT true,
  can_rate_work BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  can_view_files BOOLEAN DEFAULT true,
  assigned_forms TEXT[], -- Array of form IDs they can access
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Add feedback/ratings table
CREATE TABLE aloa_work_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES aloa_user_profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES aloa_projects(id) ON DELETE CASCADE,
  applet_id UUID REFERENCES aloa_applets(id) ON DELETE CASCADE,
  rating VARCHAR(20), -- 'thumbs_up', 'thumbs_down', 'neutral'
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing 'client' users to 'client_admin'
UPDATE aloa_user_profiles
SET role = 'client_admin'
WHERE role = 'client';
```

### 2. API Updates

#### `/api/auth/users/route.js`
- Update role validation to include new roles
- Add participant permission management
- Handle role-specific project assignments

#### `/api/auth/login/route.js`
- Update role detection for new client types
- Redirect based on specific client role

#### New: `/api/project-feedback/route.js`
- POST: Submit rating/feedback
- GET: Retrieve feedback for project
- DELETE: Remove feedback (admin only)

### 3. UI Updates

#### User Management (`/admin/users`)
- Add new role options in dropdown
- Show role-specific configuration options
- For client_participant: form assignment UI
- Permission toggles for participants

#### Client Dashboard (`/project/[projectId]/dashboard`)
- Conditional rendering based on client role
- Show approval buttons only for client_admin
- Show rating UI for client_participant
- Filter visible content based on permissions

#### Project Admin (`/admin/project/[projectId]`)
- Display feedback from all client participants
- Show participant activity logs
- Manage participant permissions

### 4. Component Updates

#### New: `ClientFeedback.js`
```jsx
// Component for rating and commenting on work
// Thumbs up/down buttons
// Comment field
// Submission history
```

#### New: `ParticipantPermissions.js`
```jsx
// Admin component to manage participant permissions
// Form assignment
// Permission toggles
```

#### Update: `ProjectDashboard.js`
- Add role-based conditional rendering
- Show/hide features based on client type

### 5. Authorization Logic

```javascript
// Helper functions for role checking
const isClientAdmin = (role) => role === 'client_admin';
const isClientParticipant = (role) => role === 'client_participant';
const isAnyClient = (role) => ['client_admin', 'client_participant'].includes(role);
const canApproveWork = (role) => ['super_admin', 'project_admin', 'client_admin'].includes(role);
const canSubmitFeedback = (role) => ['client_admin', 'client_participant'].includes(role);
```

## Migration Strategy

1. **Phase 1**: Schema updates
   - Add new role types
   - Create permission tables
   - Migrate existing clients to client_admin

2. **Phase 2**: Backend implementation
   - Update API endpoints
   - Add authorization checks
   - Implement feedback system

3. **Phase 3**: Frontend implementation
   - Update UI components
   - Add role-specific views
   - Implement feedback UI

4. **Phase 4**: Testing
   - Test all role permissions
   - Verify data isolation
   - Check edge cases

## Security Considerations

1. **Data Isolation**
   - Participants can't see each other's submissions
   - Only client_admin sees aggregated feedback
   - Strict project boundaries

2. **Permission Hierarchy**
   - Client_admin can override participant feedback
   - Agency retains ultimate control
   - Super_admin can manage all roles

3. **Audit Trail**
   - Log all approvals/rejections
   - Track feedback history
   - Monitor permission changes

## Future Enhancements

1. **Notification System**
   - Notify client_admin of participant feedback
   - Alert participants of new content
   - Deadline reminders by role

2. **Analytics Dashboard**
   - Participation metrics
   - Feedback trends
   - Engagement tracking

3. **Delegation Features**
   - Client_admin can delegate specific approvals
   - Temporary permission elevation
   - Vacation/absence handling

## Success Metrics

- Clear separation of decision-making authority
- Increased client engagement through participation
- Reduced approval bottlenecks
- Better feedback collection
- Improved project transparency

## Timeline

- Day 1: Database schema and migrations
- Day 2: Backend API updates
- Day 3: Frontend UI implementation
- Day 4: Testing and refinement
- Day 5: Documentation and deployment

## Notes

- Consider backward compatibility for existing projects
- Plan for role transitions (participant → admin)
- Document permission matrix clearly
- Create user guides for each role type