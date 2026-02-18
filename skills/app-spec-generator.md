# app-spec-generator

Generates high-quality `app_spec.md` for auto-dev projects. Creates detailed specifications that can be directly used by auto-bot for automated development.

## When to use

Use this skill when you need to create an `app_spec.md` file from scratch or improve an existing one. This is the first step before running auto-bot.

## Instructions

1. Ask the user what they want to build
2. Gather requirements through conversation
3. Create `app_spec.md` following the template below
4. Save to current working directory
5. Optionally suggest next steps (run auto-bot)

## app_spec.md Template

```markdown
# Project Name

## Overview
Brief description of what this project is and what it solves.

## Technology Stack

### Frontend
- **Framework**: Vue 3 + TypeScript + Vite
- **Package Manager**: pnpm  (npm/yarn/bun also supported)
- **Styling**: Tailwind CSS
- **State Management**: Pinia

### Backend (optional)
- **Runtime**: Node.js + Express
- **Database**: SQLite

## Core Features

### Feature Module A
- Feature point 1
- Feature point 2

### Feature Module B
- Feature point 3
- Feature point 4

## API Endpoints (if backend exists)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/resource | Get all resources |
| POST | /api/resource | Create resource |
```

## Quality Checklist

- [ ] Clear project overview
- [ ] Technology stack specified
- [ ] Package manager specified (pnpm/npm/yarn/bun)
- [ ] Core features detailed
- [ ] User stories included
- [ ] API endpoints defined if applicable
- [ ] No ambiguous requirements

## Examples

- Todo app with categories and priorities
- Chat application with real-time messaging
- E-commerce platform with cart and checkout
- Dashboard with charts and data visualization
- Blog with markdown editor

## Output

Generate a complete `app_spec.md` file in the current working directory.
