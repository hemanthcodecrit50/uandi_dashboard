# Personal Dashboard

A runtime-configurable personal dashboard inspired by Glance, Homepage, and Notion.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- **Edit Mode** — toggle to drag, resize, and delete widgets
- **Add Widget** — dropdown menu to add Clock, Note, or Anime Tracker
- **Persistent Layout** — all changes save to localStorage automatically
- **Export/Import** — share or backup your layout as JSON
- **AniList Integration** — search and track anime airing schedules

## MVP Flow

1. Open the dashboard → default layout loads (Clock + Note + Anime Tracker)
2. Click **Edit** → grid enters edit mode with drag handles
3. Click **Add Widget** → choose from registry
4. Drag and resize widgets freely
5. Click **Done** → edit mode exits
6. Refresh page → layout fully restored from localStorage

## Architecture

```
Schema (JSON)
  → Store (Zustand)
    → Renderer (React Grid Layout)
      → Widget Registry (Map)
        → React Components
```

### Key Separation of Concerns

| Layer | File | Responsibility |
|-------|------|----------------|
| Types | `src/types/index.ts` | Shared interfaces only |
| Schema | `DashboardSchema` | Pure data — no logic |
| Store | `src/store/index.ts` | All state mutations via actions |
| Registry | `src/registry/index.ts` | Widget discovery — no layout knowledge |
| Renderer | `src/renderer/index.tsx` | Mounts components from schema — no business logic |
| Widgets | `src/widgets/*/index.tsx` | Self-contained — no layout knowledge |
| Services | `src/services/anilist.ts` | API — no UI |

### Widget Registry Pattern

Each widget is a self-registering module:

```ts
export const ClockWidgetDef: WidgetDefinition = {
  id: 'ClockWidget',
  displayName: 'Clock',
  component: ClockWidget,
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 3, h: 2 },
};
```

The renderer resolves components at runtime:

```ts
const def = widgetRegistry.get(widget.component);
const Component = def.component;
return <Component id={widget.id} config={widget.config} />;
```

No switch statements. No hardcoded layouts.

### Adding a New Widget

1. Create `src/widgets/mywidget/index.tsx`
2. Export a `WidgetDefinition` constant
3. Import and `register()` it in `src/registry/index.ts`

That's it — the toolbar's "Add Widget" menu auto-discovers it.

### Layout Schema

```json
{
  "version": "1.0.0",
  "widgets": [
    {
      "id": "clock-1",
      "component": "ClockWidget",
      "layout": { "x": 0, "y": 0, "w": 4, "h": 3 },
      "config": {}
    }
  ]
}
```

## Tech Stack

- **Next.js 14** (App Router) — framework
- **React 18** — UI
- **TypeScript** — types
- **TailwindCSS** — styling
- **Zustand** — state management
- **React Grid Layout** — drag/resize grid
- **TanStack Query** — data fetching with caching
- **AniList GraphQL API** — anime data (no API key needed)

## Folder Structure

```
src/
  app/              # Next.js App Router
  components/       # Shared UI (Toolbar, WidgetWrapper)
  renderer/         # Schema → component renderer
  widgets/          # Widget implementations
    clock/
    text/
    anime/
  registry/         # Widget registry singleton
  store/            # Zustand store + actions
  services/         # External API clients
  hooks/            # Custom React hooks
  types/            # Shared TypeScript interfaces
```

## Extension Points

The architecture is ready for:

- **Plugin SDK**: `WidgetDefinition` interface is the contract
- **Cloud sync**: replace `saveLayout`/`loadLayout` in store with API calls
- **Widget marketplace**: registry already supports dynamic registration
- **Nested layouts**: `WidgetNode.config` can hold child schemas
- **User accounts**: auth wraps the store hydration step only
