# Example: Todo Application with Dashboard

> This is a DEFAULT example specification. Replace this file with your own
> application specification before running auto-dev.

## Overview

Build a full-stack todo application with a dashboard that shows task
statistics, deadlines, and productivity metrics. The application should
have a clean, modern interface with dark mode support.

## Technology Stack

### Frontend
- **Framework**: Vue 3 with Vite and TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Routing**: Vue Router
- **Package Manager**: pnpm  (or npm/yarn/bun - leave blank for npm default)

### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite with better-sqlite3

## Core Features

### Task Management
- Create, edit, delete tasks
- Mark tasks as complete/incomplete
- Set task priority (low, medium, high, urgent)
- Set due dates with calendar picker
- Add tags/labels to tasks
- Search and filter tasks
- Sort by priority, due date, or creation date
- Drag and drop to reorder tasks

### Categories
- Create custom categories
- Color-code categories
- Move tasks between categories
- Category statistics

### Dashboard
- Total tasks, completed, overdue counts
- Completion rate chart (weekly/monthly)
- Tasks by priority breakdown
- Upcoming deadlines widget
- Productivity streak tracker

### User Interface
- Dark mode / light mode toggle
- Responsive layout (mobile + desktop)
- Keyboard shortcuts
- Smooth animations
- Notification toasts for actions

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | List all tasks (with filters) |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete category |
| GET | /api/dashboard/stats | Dashboard statistics |

## Testing Requirements

When generating task.json, each task MUST include verification steps:

### Verification Types

1. **Build Verification** (all tasks)
   - Run `npm run build` - must succeed with exit code 0
   - Run `npm run lint` (if configured) - must pass

2. **Functional Verification** (UI tasks)
   - Open http://localhost:PORT in browser
   - Verify page loads without console errors
   - Click buttons, fill forms, verify interactions work
   - Take screenshot as proof

3. **API Verification** (backend tasks)
   - Use curl or browser devtools to test endpoints
   - Verify response status codes
   - Verify response data format

### Example task.json format:

```jsonc
[
  {
    "id": 1,
    "category": "functional",
    "description": "User can create a new task and see it in the list",
    "steps": [
      "1. Run npm run dev to start the development server",
      "2. Open http://localhost:5173 in browser",
      "3. Click the 'New Task' button",
      "4. Fill in task title 'Test Task'",
      "5. Click 'Save' button",
      "6. Verify 'Test Task' appears in the task list",
      "7. VERIFY: npm run build succeeds with no errors",
      "8. VERIFY: Browser console has no errors",
      "9. VERIFY: Screenshot shows task in list"
    ],
    "passes": false
  }
]
```

**CRITICAL**: Every task's steps[] MUST include "VERIFY:" prefixed steps.
Never mark a task as passes:true without performing and confirming all verification steps.
