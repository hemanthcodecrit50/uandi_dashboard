# Next Iteration Prompt

You have full context of this repository.

Do NOT rebuild from scratch. Treat the existing codebase as the source of truth and evolve it incrementally.

---

# Current State

The project is a widget platform with an optional social layer (Friend Productivity Network).

## What exists:

### Architecture
- Widget Definition (id, displayName, description, icon, component, defaultSize, minSize, capabilities, configurationSchema, tags)
- Widget Instance (instanceId, widgetType, dashboardId, layout, configuration, visibility, mode, dataSourceId)
- Dashboard Entity (id, name, icon, theme, settings, isDefault)
- Widget Registry (static map, get/getAll methods)
- Schema v2 with automatic v1 migration
- Multi-dashboard support with CRUD operations

### Features
- Widget registry + runtime loading
- React Grid Layout (12 columns, 60px row height)
- Edit mode (drag, resize, remove widgets)
- Layout persistence (localStorage, schema v2)
- Import/Export (JSON)
- Dashboard switcher (create, delete, rename, switch)
- 4 existing widgets (Clock, Note, Anime Tracker, Gmail)
- AniList GraphQL integration
- Gmail API integration with OAuth2
- Dark theme with custom design tokens

### Tech Stack
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- Zustand 4
- TanStack React Query 5
- react-grid-layout
- TailwindCSS + custom CSS
- lucide-react icons
- better-sqlite3 (server-side tokens)
- jose (JWT sessions)

---

# Implementation Rules

1. Analyze the current repository
2. Identify the highest-impact improvement
3. Explain your reasoning
4. List files that will change
5. Implement ONLY that improvement
6. Ensure the project builds successfully
7. Stop and wait for review

Never modify more than 15–20 files in a single iteration.
Prefer incremental refactoring over replacement.

---

# Priority Order

## Phase 2: Widget Performance + Data Layer

### 2A: Widget Lazy Loading + Dynamic Imports
- Wrap each widget component in `React.lazy()` + `Suspense`
- Update registry to support lazy component loading
- Add loading skeleton for each widget
- Update renderer to handle async component loading
- Verify all 4 widgets still work

**Files likely to change:**
- src/registry/index.ts
- src/renderer/index.tsx
- src/widgets/*/index.tsx (definition exports only)
- src/app/globals.css (skeleton styles)

### 2B: Repository Pattern (Data Layer Abstraction)
- Create `StorageProvider` interface with get/set/delete/list methods
- Implement `LocalStorageProvider` (current behavior)
- Create `InMemoryProvider` (for testing/fallback)
- Update persistence.ts to use provider interface
- Update store to use provider
- Prepare `SqliteProvider` stub for future migration

**Files likely to change:**
- src/lib/storage/types.ts (new)
- src/lib/storage/local.ts (new)
- src/lib/storage/memory.ts (new)
- src/services/persistence.ts
- src/store/index.ts

## Phase 3: Widget Configuration + Dashboard UI

### 3A: Widget Configuration Panel
- Create `WidgetConfigPanel` component
- Read `configurationSchema` from widget definition
- Auto-generate form fields (text, number, boolean, select, color)
- Wire to `updateWidgetConfig` store action
- Show config panel when clicking a settings icon on widget

**Files likely to change:**
- src/components/WidgetConfigPanel.tsx (new)
- src/components/WidgetWrapper.tsx
- src/types/index.ts (ConfigurationSchema enhancement)
- src/app/globals.css

### 3B: Dashboard Settings UI
- Add settings dropdown to dashboard switcher
- Rename dashboard inline
- Theme picker (background color, accent color)
- Grid settings (columns, row height)
- Duplicate dashboard action
- Delete dashboard with confirmation

**Files likely to change:**
- src/components/Toolbar.tsx
- src/components/DashboardSettings.tsx (new)
- src/store/index.ts
- src/types/index.ts
- src/app/globals.css

## Phase 4: Permissions System

### 4A: Widget Permissions
- Create `PermissionsPanel` component
- Visibility selector (private/friends/public)
- Mode selector (readonly/collaborative)
- Show permissions indicator on widget (lock icon, globe icon)
- Filter widgets by visibility (prepare for social layer)

**Files likely to change:**
- src/components/PermissionsPanel.tsx (new)
- src/components/WidgetWrapper.tsx
- src/store/index.ts
- src/types/index.ts
- src/app/globals.css

## Phase 5: New Widgets

### 5A: Quick Win Widgets (batch add)
Add 4-6 new widgets in one iteration:
- **Weather** — OpenWeatherMap API, current + forecast
- **Pomodoro** — Timer with work/break cycles, configurable durations
- **Markdown** — Render markdown with live preview
- **Kanban** — Simple 3-column board (todo/doing/done), local state
- **RSS** — RSS/Atom feed reader, configurable feed URL
- **GitHub** — Public repos, recent commits, contribution graph

**For each widget:**
1. Create `src/widgets/{name}/index.tsx`
2. Export `WidgetDefinition` with icon, capabilities, tags
3. Register in `src/registry/index.ts`
4. If API-based, create server route in `src/app/api/`

**Files likely to change:**
- src/widgets/{name}/index.tsx (new, per widget)
- src/app/api/{name}/route.ts (new, if API needed)
- src/registry/index.ts
- src/app/globals.css (widget-specific styles)

### 5B: Data-Heavy Widgets (require data sources)
- **Spotify** — Now playing, recently played, top artists (needs OAuth)
- **Calendar** — Google Calendar integration (needs OAuth)
- **Finance** — Stock/crypto prices, portfolio tracking
- **Habit Tracker** — Daily habits with streaks
- **Health** — Step count, sleep data (API integration)
- **AI Assistant** — Chat interface, prompt templates

These require the Data Layer (Phase 2B) and potentially OAuth flows.

## Phase 6: Social Foundation

### 6A: User Profiles + Friend System
- User profile page (name, avatar, bio)
- Friend request sent/received
- Friend list management
- Public profile toggle
- prepare for public dashboard sharing

**Files likely to change:**
- src/app/profile/page.tsx (new)
- src/components/FriendList.tsx (new)
- src/components/FriendRequest.tsx (new)
- src/lib/db.ts (schema updates)
- src/store/index.ts (user state)
- src/types/index.ts (User, Friend types)

### 6B: Dashboard Sharing
- Public dashboard URLs
- Shared dashboard access
- Widget-level sharing
- Read-only shared view

## Phase 7: Collaboration

### 7A: Generic Collaboration Layer
- WebSocket connection manager
- Operational Transform or CRDT for concurrent edits
- Cursor presence indicators
- Conflict resolution
- Shared state sync for collaborative widgets

**Files likely to change:**
- src/lib/collaboration/types.ts (new)
- src/lib/collaboration/socket.ts (new)
- src/lib/collaboration/sync.ts (new)
- src/store/index.ts (collaborative state)
- src/types/index.ts (Collaboration types)

---

# Architecture Reference

## Platform Hierarchy

```
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
```

## Widget Lifecycle

1. Developer creates widget folder + exports WidgetDefinition
2. Developer registers widget in registry
3. User clicks "Add Widget" in toolbar
4. Store creates WidgetInstance with unique instanceId
5. Renderer looks up WidgetDefinition from registry
6. Renderer renders component with WidgetProps (id, config)
7. Widget reads/writes config via store.updateWidgetConfig()
8. Widget data persists to localStorage via persistence service

## Data Flow

```
User Action
    ↓
Store Action (addWidget, moveWidget, etc.)
    ↓
State Update (Zustand)
    ↓
Persistence (localStorage → schema v2)
    ↓
UI Re-render (React)
```

## Adding a New Widget

1. Create `src/widgets/mywidget/index.tsx`
2. Export `WidgetDefinition`:

```ts
export const MyWidgetDef: WidgetDefinition = {
  id: 'MyWidget',
  displayName: 'My Widget',
  description: 'What it does',
  icon: 'IconName', // lucide icon
  component: MyWidget,
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  capabilities: ['configurable'],
  tags: ['productivity'],
  configurationSchema: {
    fields: [
      { key: 'title', label: 'Title', type: 'text', defaultValue: 'Default' },
    ],
  },
};
```

3. Register in `src/registry/index.ts`:

```ts
import { MyWidgetDef } from '@/widgets/mywidget';

const WIDGETS = {
  // ... existing widgets
  [MyWidgetDef.id]: MyWidgetDef,
};
```

4. If API needed, create `src/app/api/mywidget/route.ts`

That's it. Toolbar auto-discovers it.

---

# Working Style

DO NOT attempt to implement everything in one iteration.

Instead:
1. Analyze the current repository
2. Identify the highest-impact architectural improvement
3. Explain your reasoning
4. List the files that will change
5. Implement only that improvement
6. Ensure the project still builds successfully
7. Stop and wait for review

Never modify more than 15–20 files in a single iteration.
Avoid unnecessary rewrites.
Prefer incremental refactoring over replacement.
At every step, think like a staff software engineer building a platform intended to scale beyond a personal project into a publicly deployed productivity ecosystem.
