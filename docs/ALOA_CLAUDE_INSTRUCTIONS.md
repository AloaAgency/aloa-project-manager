# Claude Instructions for Aloa Project Management Tool Bug & Feature Tracking

## System Context

You have access to a Bug & Feature Tracker API for the Aloa Project Management Tool. The API credentials are configured in your environment variables. Use this system to:

1. Check for outstanding bugs and features at the start of each session
2. Report any bugs you encounter while working
3. Track feature requests from users
4. Mark items as complete when you finish them

## Environment Configuration

The following environment variables are configured in `.env.local`:

```bash
BFT_API_KEY="bft_pm_8c4c04b8e82bf46cb93f56131cc0f63c"
BFT_PROJECT_ID="22222222-bbbb-5555-cccc-000000000002"
BFT_BASE_URL="https://v0-feature-and-bug-tracker-three.vercel.app/api"
```

## Claude Workflow Instructions

### 1. At the Start of Each Session

Check for outstanding items and prioritize work:

```javascript
// Check what needs to be done
async function checkOutstandingWork() {
  // Get next priority item
  const nextResponse = await fetch(
    `${process.env.BFT_BASE_URL}/claude-code/next?projectId=${process.env.BFT_PROJECT_ID}`,
    {
      headers: { 'x-api-key': process.env.BFT_API_KEY }
    }
  );
  const next = await nextResponse.json();

  if (next.hasNext) {
    console.log(`Priority Task: ${next.item.type} - ${next.item.title}`);
    console.log(`Description: ${next.item.description}`);
    console.log(`ID: ${next.item.id}`);
    return next.item;
  }

  // If no priority item, check all outstanding
  const itemsResponse = await fetch(
    `${process.env.BFT_BASE_URL}/public/items?projectId=${process.env.BFT_PROJECT_ID}&status=active`,
    {
      headers: { 'x-api-key': process.env.BFT_API_KEY }
    }
  );
  const items = await itemsResponse.json();

  return items.data;
}
```

### 2. When You Encounter a Bug

Automatically report bugs you find while working:

```javascript
// Report a bug you've discovered
async function reportBug(title, description, context = {}) {
  const bugData = {
    project_id: process.env.BFT_PROJECT_ID,
    type: 'bug',
    title: title,
    description: `${description}

Context:
- File: ${context.file || 'Unknown'}
- Function: ${context.function || 'Unknown'}
- Line: ${context.line || 'Unknown'}
- Error: ${context.error || 'N/A'}
- Timestamp: ${new Date().toISOString()}
- Discovered by: Claude
    `
  };

  const response = await fetch(`${process.env.BFT_BASE_URL}/public/items`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.BFT_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bugData)
  });

  const result = await response.json();
  console.log(`Bug reported: ${result.data.id}`);
  return result.data;
}
```

### 3. When Users Request Features

Track feature requests from user conversations:

```javascript
// Log a feature request from user
async function logFeatureRequest(title, description, userContext = '') {
  const featureData = {
    project_id: process.env.BFT_PROJECT_ID,
    type: 'feature',
    title: title,
    description: `${description}

User Context: ${userContext}
Requested: ${new Date().toISOString()}
Logged by: Claude
    `
  };

  const response = await fetch(`${process.env.BFT_BASE_URL}/public/items`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.BFT_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(featureData)
  });

  const result = await response.json();
  console.log(`Feature request logged: ${result.data.id}`);
  return result.data;
}
```

### 4. When You Complete a Task

Mark items as complete when you finish them:

```javascript
// Mark a bug or feature as complete
async function markComplete(itemId, completionNotes) {
  const response = await fetch(`${process.env.BFT_BASE_URL}/claude-code/complete`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.BFT_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      itemId: itemId,
      notes: `Completed by Claude

Implementation Details:
${completionNotes}

Completion Time: ${new Date().toISOString()}
      `
    })
  });

  const result = await response.json();
  console.log(`Item ${itemId} marked as complete`);
  return result;
}
```

## Proactive Behaviors for Claude

### Daily Startup Routine

When starting a session, Claude should:

1. **Check for priority items**:
   ```javascript
   const priority = await checkOutstandingWork();
   if (priority) {
     // Focus on the priority item first
   }
   ```

2. **Scan for critical bugs**:
   ```javascript
   const bugs = await fetch(
     `${process.env.BFT_BASE_URL}/public/items?projectId=${process.env.BFT_PROJECT_ID}&status=active&type=bug`,
     { headers: { 'x-api-key': process.env.BFT_API_KEY } }
   ).then(r => r.json());

   // Prioritize critical bugs
   const critical = bugs.data.filter(b =>
     b.title.toLowerCase().includes('critical') ||
     b.description.toLowerCase().includes('urgent')
   );
   ```

### During Development

While working on code, Claude should:

1. **Report bugs immediately when found**:
   - Syntax errors in existing code
   - Logic errors that could cause runtime issues
   - Security vulnerabilities
   - Performance bottlenecks
   - Missing error handling

2. **Log feature ideas**:
   - Improvements noticed while working
   - User experience enhancements
   - Code refactoring opportunities
   - Performance optimizations

3. **Update task status**:
   - Mark items as complete immediately after fixing
   - Add detailed notes about the solution
   - Reference relevant files and commits

### Example Claude Workflow

```javascript
// Claude's task management workflow
async function claudeTaskWorkflow() {
  console.log("🔍 Checking for outstanding tasks...");

  // 1. Get next priority task
  const next = await getNextPriorityTask();

  if (next.hasNext) {
    const task = next.item;
    console.log(`\n📋 Working on: ${task.type.toUpperCase()} - ${task.title}`);
    console.log(`Description: ${task.description}`);

    // 2. Work on the task
    try {
      if (task.type === 'bug') {
        // Fix the bug
        const solution = await fixBug(task);

        // 3. Mark as complete
        await markComplete(task.id, solution);
        console.log("✅ Bug fixed and marked as complete!");
      } else if (task.type === 'feature') {
        // Implement the feature
        const implementation = await implementFeature(task);

        // 3. Mark as complete
        await markComplete(task.id, implementation);
        console.log("✅ Feature implemented and marked as complete!");
      }
    } catch (error) {
      console.error(`❌ Error working on task: ${error.message}`);
      // Could create a new bug report for the error
      await reportBug(
        `Error implementing: ${task.title}`,
        `Failed to complete task ${task.id}: ${error.message}\n${error.stack}`
      );
    }
  } else {
    console.log("✨ No outstanding tasks! All caught up.");
  }
}
```

## Quick Reference - API Endpoints

All requests require the `x-api-key` header with your API key.

### Get Next Priority Task
```
GET https://v0-feature-and-bug-tracker-three.vercel.app/api/claude-code/next?projectId=22222222-bbbb-5555-cccc-000000000002
```

### List All Active Items
```
GET https://v0-feature-and-bug-tracker-three.vercel.app/api/public/items?projectId=22222222-bbbb-5555-cccc-000000000002&status=active
```

### Create Bug/Feature
```
POST https://v0-feature-and-bug-tracker-three.vercel.app/api/public/items
Body: {
  "project_id": "22222222-bbbb-5555-cccc-000000000002",
  "type": "bug" or "feature",
  "title": "Title",
  "description": "Description"
}
```

### Mark Complete
```
POST https://v0-feature-and-bug-tracker-three.vercel.app/api/claude-code/complete
Body: {
  "itemId": "item-uuid",
  "notes": "Completion notes"
}
```

## Best Practices for Claude

1. **Always check for tasks at session start** - This ensures you're aware of priorities
2. **Report bugs immediately** - Don't wait, report as soon as you find them
3. **Be descriptive** - Include file paths, line numbers, and error messages
4. **Complete tasks atomically** - Mark items complete as soon as they're done
5. **Add context** - Your completion notes help future debugging

## Error Handling

If API calls fail:

```javascript
async function safeApiCall(apiFunction, ...args) {
  try {
    return await apiFunction(...args);
  } catch (error) {
    console.error(`API Error: ${error.message}`);

    // Log to local file if API is down
    const fs = require('fs');
    fs.appendFileSync('api-errors.log', `
[${new Date().toISOString()}] API Error
Function: ${apiFunction.name}
Args: ${JSON.stringify(args)}
Error: ${error.message}
---
    `);

    return null;
  }
}
```

## Testing the Integration

Test that your API connection works:

```bash
# Quick test from terminal
curl -H "x-api-key: bft_pm_8c4c04b8e82bf46cb93f56131cc0f63c" \
  "https://v0-feature-and-bug-tracker-three.vercel.app/api/claude-code/next?projectId=22222222-bbbb-5555-cccc-000000000002"
```

Expected response:
```json
{
  "success": true,
  "hasNext": false,
  "message": "No outstanding items"
}
```

---

## Summary for Claude

You are connected to the Aloa Project Management Tool Bug & Feature Tracker. Your responsibilities:

1. ✅ **Start each session** by checking for outstanding tasks
2. 🐛 **Report bugs** immediately when you find them
3. ✨ **Log feature requests** from user conversations
4. 📋 **Mark items complete** when you finish them
5. 📝 **Add detailed notes** to help with future work

The API credentials are in your environment. Use them proactively to keep the project organized and tracked.

---

*This document is for Claude AI working on the Aloa Project Management Tool*
*API Key: Configured in .env.local*
*Project ID: 22222222-bbbb-5555-cccc-000000000002*