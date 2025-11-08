# Prototype Review Admin Integration Requirements

## Overview
The Prototype Review applet needs to be integrated into the admin dashboard following the established two-sided applet architecture. This document outlines what needs to be added to `/app/admin/project/[projectId]/page.js`.

## Required Admin-Side Features

### 1. Inline Configuration Panel
The admin should be able to configure the prototype review applet directly from the projectlet view without opening a modal.

**Location:** Around line 3608 in `/app/admin/project/[projectId]/page.js` (after palette_cleanser config)

```javascript
{/* Inline prototype review configuration */}
{expandedApplets[applet.id] && applet.type === 'prototype_review' && (
  <div className="mt-3 w-full p-3 bg-gray-50 rounded-lg space-y-3">
    {/* Lock/Unlock toggle */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {applet.config?.locked ? (
          <Lock className="w-4 h-4 text-red-600" />
        ) : (
          <Unlock className="w-4 h-4 text-green-600" />
        )}
        <span className="text-sm font-medium">
          {applet.config?.locked ? 'Reviews Locked' : 'Reviews Unlocked'}
        </span>
      </div>
      <button
        onClick={async () => {
          // Toggle lock state via PATCH request
          const newLockedState = !applet.config?.locked;
          const response = await fetch(
            `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                config: {
                  ...applet.config,
                  locked: newLockedState
                }
              })
            }
          );
          if (response.ok) {
            fetchProjectletApplets(projectlet.id);
            toast.success(newLockedState ? 'Reviews locked' : 'Reviews unlocked');
          }
        }}
        className="px-3 py-1 text-sm bg-white border rounded-lg hover:bg-gray-50"
      >
        {applet.config?.locked ? 'Unlock' : 'Lock'}
      </button>
    </div>

    {/* Prototype Statistics */}
    <div className="grid grid-cols-3 gap-2">
      <div className="text-center p-2 bg-white rounded border">
        <div className="text-lg font-semibold">{applet.prototypes?.length || 0}</div>
        <div className="text-xs text-gray-600">Prototypes</div>
      </div>
      <div className="text-center p-2 bg-white rounded border">
        <div className="text-lg font-semibold">{applet.total_comments || 0}</div>
        <div className="text-xs text-gray-600">Total Comments</div>
      </div>
      <div className="text-center p-2 bg-white rounded border">
        <div className="text-lg font-semibold">{applet.unresolved_comments || 0}</div>
        <div className="text-xs text-gray-600">Open Issues</div>
      </div>
    </div>

    {/* Actions */}
    <div className="flex gap-2">
      <button
        onClick={() => {
          setSelectedApplet(applet);
          setShowPrototypeUploadModal(true);
        }}
        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload Prototype
      </button>
      <button
        onClick={() => {
          setSelectedApplet(applet);
          setShowPrototypeReviewModal(true);
        }}
        className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        View Reviews
      </button>
    </div>

    {/* Auto-resolve setting */}
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={`auto-resolve-${applet.id}`}
        checked={applet.config?.autoResolveOnApproval || false}
        onChange={async (e) => {
          const response = await fetch(
            `/api/aloa-projects/${params.projectId}/projectlets/${projectlet.id}/applets/${applet.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                config: {
                  ...applet.config,
                  autoResolveOnApproval: e.target.checked
                }
              })
            }
          );
          if (response.ok) {
            fetchProjectletApplets(projectlet.id);
          }
        }}
        className="rounded"
      />
      <label htmlFor={`auto-resolve-${applet.id}`} className="text-sm text-gray-700">
        Auto-resolve comments when prototype is approved
      </label>
    </div>
  </div>
)}
```

### 2. Avatar Display for Reviewers
Similar to other applets, show avatars of users who have commented on prototypes.

**Location:** Around line 2931 (in the avatar display section)

```javascript
{/* Reviewer avatars for prototype review */}
{applet.type === 'prototype_review' && applet.reviewers && applet.reviewers.length > 0 && (
  <div className="flex items-center space-x-2 ml-3">
    <div className="flex -space-x-2">
      {applet.reviewers.slice(0, 4).map((reviewer) => (
        <div
          key={reviewer.id}
          className="relative group cursor-pointer hover:scale-110 transition-transform"
          title={`${reviewer.name} - ${reviewer.comment_count} comment(s)`}
        >
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white">
            {reviewer.avatar ? (
              <img src={reviewer.avatar} className="w-full h-full rounded-full" />
            ) : (
              <span className="text-xs font-medium">
                {reviewer.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          {reviewer.has_unresolved && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>
      ))}
      {applet.reviewers.length > 4 && (
        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center ring-2 ring-white">
          <span className="text-xs font-medium">+{applet.reviewers.length - 4}</span>
        </div>
      )}
    </div>
  </div>
)}
```

### 3. Required State Variables
Add to the component's state declarations:

```javascript
const [showPrototypeUploadModal, setShowPrototypeUploadModal] = useState(false);
const [showPrototypeReviewModal, setShowPrototypeReviewModal] = useState(false);
const [selectedApplet, setSelectedApplet] = useState(null);
```

### 4. Modal Components
Two new modals need to be created:

#### a. Prototype Upload Modal
- Upload image files or enter URLs for screenshots
- Set prototype name and description
- Configure review settings (deadline, required reviewers)

#### b. Prototype Review Management Modal
- List all prototypes for the applet
- Show comment counts and status
- Quick actions (archive, delete, export feedback)
- Direct link to review interface

### 5. Component Icons and Colors
Already configured in `/components/ProjectletAppletsManager.js`, but verify:

```javascript
const APPLET_ICONS = {
  // ... existing icons
  prototype_review: MessageSquare // from lucide-react
};

const APPLET_COLORS = {
  // ... existing colors
  prototype_review: 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-300'
};
```

## API Integration Points

The admin interface should interact with these endpoints:

1. **List Prototypes:** `GET /api/aloa-projects/[projectId]/prototypes?appletId=[id]`
2. **Upload Prototype:** `POST /api/aloa-projects/[projectId]/prototypes`
3. **Update Prototype:** `PATCH /api/aloa-projects/[projectId]/prototypes/[prototypeId]`
4. **Delete Prototype:** `DELETE /api/aloa-projects/[projectId]/prototypes/[prototypeId]`
5. **Get Comment Statistics:** Included in prototype list response

## Data Structure Expected

The admin view expects this data structure from the API:

```javascript
applet: {
  id: 'uuid',
  type: 'prototype_review',
  config: {
    locked: false,
    allowMultiplePrototypes: true,
    autoResolveOnApproval: false
  },
  // Extended with computed fields:
  prototypes: [
    {
      id: 'uuid',
      name: 'Homepage v1',
      total_comments: 12,
      unresolved_comments: 3,
      created_at: '2025-01-01T00:00:00Z'
    }
  ],
  total_comments: 45,
  unresolved_comments: 8,
  reviewers: [
    {
      id: 'uuid',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'url',
      comment_count: 5,
      has_unresolved: true
    }
  ]
}
```

## Implementation Priority

1. **Phase 1 (Required):** Basic inline configuration with lock/unlock
2. **Phase 2 (Required):** Statistics display (prototype count, comments)
3. **Phase 3 (Important):** Upload prototype action button
4. **Phase 4 (Nice to have):** Reviewer avatars with activity indicators
5. **Phase 5 (Optional):** Advanced settings (auto-resolve, review deadlines)

## Testing Checklist

- [ ] Inline configuration panel appears when applet is expanded
- [ ] Lock/unlock toggle works and persists
- [ ] Statistics update in real-time
- [ ] Upload button opens appropriate modal/interface
- [ ] View reviews button navigates to review interface
- [ ] Avatar display shows active reviewers
- [ ] All PATCH requests update the database correctly
- [ ] UI updates reflect database changes immediately

## Notes

- Follow the exact pattern used by `palette_cleanser` and `link_submission` applets
- All configuration changes should use PATCH requests to update `applet.config`
- Use toast notifications for user feedback on actions
- Ensure proper error handling for all API calls
- Statistics should be computed server-side and cached for performance