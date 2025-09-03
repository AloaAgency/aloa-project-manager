# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based dynamic form builder application that allows users to create forms using a markdown-based DSL, collect responses, and manage form submissions.

## Project Setup

Currently, the project consists of a single React component file (`start-here-readme.md`) that needs to be properly structured into a React application.

### Initial Setup Tasks

1. **Create Project Structure**:
   ```bash
   npm init -y
   npm install react react-dom lucide-react
   npm install -D @vitejs/plugin-react vite tailwindcss postcss autoprefixer
   ```

2. **Initialize Tailwind CSS**:
   ```bash
   npx tailwindcss init -p
   ```

3. **Rename and Move Component**:
   - Move `start-here-readme.md` to `src/components/FormBuilder.jsx`
   - Create proper React app structure with `src/App.jsx` and `src/main.jsx`

## Development Commands

Once properly set up:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Code Architecture

### FormBuilder Component (`start-here-readme.md`)

The application is built as a single, self-contained React component with three main views:

1. **Admin View** - Form creation and management interface
   - Create forms using markdown DSL
   - View existing forms
   - Access form URLs for sharing
   - Delete forms
   - Navigate to responses

2. **Form View** - End-user form interface
   - Dynamic form rendering based on markdown definition
   - Field validation
   - Response submission

3. **Responses View** - Response management
   - View all responses for a form
   - Export responses as JSON

### Markdown DSL Format

Forms are defined using a custom markdown format:
- `# Title` - Form title
- `## Section: Name` - Section headers
- `- type* | field_id | Label` - Field definitions
  - Types: `text`, `textarea`, `select`, `radio`, `checkbox`
  - `*` suffix indicates required field
  - Options are indented with `  - Option`

### State Management

The component uses React hooks for state:
- `forms` - Object storing all form definitions
- `formResponses` - Object storing responses by form ID
- `activeFormId` - Currently selected form
- `currentResponse` - Active form submission data
- `view` - Current view mode ('admin', 'form', 'responses')

### Key Functions

- `parseMarkdown()` - Converts markdown DSL to form structure
- `createForm()` - Creates new form from markdown
- `handleSubmit()` - Processes and stores form submissions
- `validateForm()` - Validates required fields
- `downloadResponses()` - Exports responses as JSON

## Dependencies

- **React** - UI framework
- **lucide-react** - Icon library
- **Tailwind CSS** - Utility-first CSS framework (needs configuration)

## Data Persistence

Currently uses browser's local state only. Consider implementing:
- LocalStorage for client-side persistence
- Backend API for production use
- Database integration for multi-user support