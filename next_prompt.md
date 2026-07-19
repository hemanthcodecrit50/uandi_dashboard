You already have full context of the current repository.

Do NOT rebuild the application from scratch.

Treat the existing codebase as the source of truth and evolve it into a scalable, production-ready platform.

Your goal is to preserve what already works while improving the architecture to support long-term growth.

---

# Vision

This project is no longer just a personal dashboard.

It is evolving into a **widget platform with an optional social layer**.

The long-term goal is to create a **Friend Productivity Network**, where users share carefully selected parts of their digital workspace instead of posting on a traditional social feed.

The experience should remain personal-first.

Users visit dashboards instead of scrolling feeds.

Social interaction is based around widgets, not posts.

---

# Preserve Existing Features

Do not remove or unnecessarily rewrite existing functionality.

Keep and improve:

- Widget Registry
- Runtime widget loading
- React Grid Layout
- Edit Mode
- Drag & Resize
- Layout persistence
- Import / Export
- Existing widgets
- AniList integration
- Gmail integration
- Current UI/UX
- Dark theme
- Existing design language

Only refactor when there is a clear architectural benefit.

---

# New Architecture

Refactor the project toward this hierarchy:

Platform
├── Users
├── Dashboards
│     ├── Layout
│     ├── Theme
│     └── Settings
├── Widget Definitions
├── Widget Instances
├── Widget Data Sources
├── Permissions
├── Collaboration
├── Social Layer
└── Plugin SDK

The project should be designed as a platform rather than a single dashboard.

---

# Widget System

Strengthen the existing registry into a true plugin architecture.

Every widget should have three independent concepts.

## 1. Widget Definition

Static metadata describing the widget.

Contains:

- id
- displayName
- description
- icon
- component
- defaultSize
- minimumSize
- configurationSchema
- capabilities

Example capabilities:

- shareable
- collaborative
- exportable
- searchable
- realtime
- configurable

The application should use capabilities to determine available actions instead of hardcoding behavior.

---

## 2. Widget Instance

Represents one widget placed on a dashboard.

Contains:

- instanceId
- widgetType
- dashboardId
- layout
- configuration
- permissions
- visibility
- dataSourceId

The widget instance should never own business data.

---

## 3. Widget Data

Business data must be stored separately.

Examples:

Todo List

Shopping List

Anime Collection

Shared Notes

Calendar Events

Bookmarks

This allows multiple widgets to reference the same underlying data source.

Example:

The same Todo List can appear on two dashboards.

---

# Dashboard System

Support multiple dashboards per user.

Examples:

- Personal
- Public
- Study
- Work
- Gaming
- Shared

The current dashboard becomes one dashboard owned by the user.

Dashboards should support:

- custom layout
- custom theme
- export
- import
- duplication
- sharing

---

# Permissions

Every widget should support generic permissions.

Visibility:

- Private
- Friends
- Public

Mode:

- Read Only
- Collaborative

Permission logic must not be implemented individually inside widgets.

---

# Social Layer

Prepare the architecture for:

- User accounts
- Friend requests
- Friend lists
- Public profiles
- Public dashboards
- Shared dashboards
- Widget sharing
- Collaborative widgets

Important:

There should NEVER be an infinite scrolling social feed.

The primary navigation model is:

User

↓

Dashboard

↓

Widgets

---

# Data Layer

Abstract persistence behind repositories/services.

The UI should never know whether data comes from:

- localStorage
- SQLite
- PostgreSQL
- Supabase

Prepare the architecture for migrating to PostgreSQL later without changing the UI layer.

---

# Plugin SDK

The registry should evolve into a future Plugin SDK.

A new widget should only require:

1. Creating a widget folder
2. Exporting a WidgetDefinition
3. Registering the widget

Everything else should work automatically.

Avoid switch statements and widget-specific conditionals.

---

# Future Widgets

Design the architecture so these widgets can be added later without major refactoring:

- Spotify
- GitHub
- LeetCode
- Steam
- RSS
- Calendar
- Weather
- Pomodoro
- Habit Tracker
- Finance
- Markdown
- Kanban
- Health
- AI Assistant

---

# Collaboration

Build a generic collaboration layer.

Do not implement collaboration separately inside each widget.

Shared Notes, Todo, Calendar, and Kanban should all reuse the same collaboration architecture.

---

# Code Quality

While refactoring:

- Improve TypeScript typing
- Remove duplicated logic
- Improve naming consistency
- Reduce coupling
- Separate UI from business logic
- Separate business logic from persistence
- Keep components focused
- Keep architecture modular
- Prefer composition over inheritance
- Follow SOLID principles where appropriate

---

# Performance

Maintain or improve performance.

Prefer:

- Lazy-loaded widgets
- Dynamic imports
- Memoization
- TanStack Query caching
- Server Components where appropriate

Avoid unnecessary rerenders.

---

# Documentation

Document every important architectural decision.

Explain:

- Folder structure
- Widget lifecycle
- Renderer flow
- Registry flow
- Permission flow
- Data flow
- Collaboration flow
- Future extension points

Architecture clarity is more important than code volume.

---

# Working Style

This is extremely important.

DO NOT attempt to implement everything in one iteration.

Instead:

1. Analyze the current repository.
2. Identify the highest-impact architectural improvement.
3. Explain your reasoning.
4. List the files that will change.
5. Implement only that improvement.
6. Ensure the project still builds successfully.
7. Stop and wait for review.

Never modify more than 15–20 files in a single iteration.

Avoid unnecessary rewrites.

Prefer incremental refactoring over replacement.

When multiple approaches are possible, choose the one that minimizes future technical debt while preserving the existing codebase.

At every step, think like a staff software engineer building a platform intended to scale beyond a personal project into a publicly deployed productivity ecosystem.
