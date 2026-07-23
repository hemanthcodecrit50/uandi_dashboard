# Personal Dashboard

A runtime-configurable personal dashboard inspired by Glance, Homepage, and Notion.

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in Google OAuth creds (optional)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | For Gmail widget | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Gmail widget | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For Gmail widget | e.g. `http://localhost:3000/api/auth/callback` |
| `SESSION_SECRET` | For Gmail widget | Random string, min 32 chars |
| `TOKEN_ENCRYPTION_KEY` | For Gmail widget | 64-char hex string (32 bytes) |
| `DB_PATH` | No | SQLite path (default: `./data/dashboard.db`) |

Widgets like Clock, Weather, Pomodoro, Markdown, Kanban, RSS, and GitHub work without any env vars.

## Features

- **10 Widgets** — Clock, Note, Anime Tracker, Gmail, Weather, Pomodoro, Markdown, Kanban, RSS, GitHub
- **Edit Mode** — drag, resize, delete widgets
- **Widget Configuration** — per-widget settings via auto-generated forms
- **Widget Permissions** — visibility (private/friends/public) and access mode
- **Dashboard Settings** — theme picker, accent colors, grid columns/height, duplicate dashboard
- **Multi-Dashboard** — create, rename, switch, delete dashboards
- **Persistent Layout** — all changes save to localStorage automatically
- **Export/Import** — backup your layout as JSON

## Architecture

```
Schema v2 (JSON)
  → Store (Zustand)
    → Renderer (React Grid Layout)
      → Widget Registry (lazy-loaded components)
        → Widget Components
```

### Widget System

Each widget exports metadata + component separately:

```ts
// src/widgets/mywidget/index.tsx
export default function MyWidget({ id, config }: WidgetProps) { ... }

export const metadata: WidgetDefinition = {
  id: 'MyWidget',
  displayName: 'My Widget',
  description: 'What it does',
  icon: 'IconName',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  capabilities: ['configurable'],
  configurationSchema: {
    fields: [
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#7c6aff' },
    ],
  },
};
```

Register in `src/registry/index.ts`:

```ts
import { metadata as myMeta } from '@/widgets/mywidget';
const LazyMyWidget = React.lazy(() => import('@/widgets/mywidget'));

const WIDGETS = {
  [myMeta.id]: { ...myMeta, component: LazyMyWidget },
};
```

The Add Widget menu auto-discovers it. No switch statements.

### Adding a New Widget

1. Create `src/widgets/mywidget/index.tsx`
2. Export a default component + `metadata` constant
3. Import and register in `src/registry/index.ts`

## API Routes

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| `GET` | `/api/health` | No | — | Health check (DB ping) |
| `GET` | `/api/auth/google` | No | — | Redirect to Google OAuth |
| `GET` | `/api/auth/callback` | No | — | OAuth callback (token exchange) |
| `GET` | `/api/auth/me` | Session | — | Get current user profile |
| `POST` | `/api/auth/logout` | Session | — | Delete tokens, clear session |
| `GET` | `/api/gmail/messages` | Session | 10/user/min | Fetch inbox (urgency-classified) |
| `GET` | `/api/gmail/messages/:id` | Session | 10/user/min | Fetch full email body |
| `GET` | `/api/rss?url=...` | No | 20/IP/min | Fetch and parse RSS feed |
| `GET` | `/api/github?username=...` | No | 20/IP/min | GitHub user + events |

### Gmail Urgency Classification

Server-side regex-based, never exposed to client:

- **Critical** — "urgent", "asap", "critical", "emergency", "action required"
- **High** — "deadline", "important", "approval", "follow-up" + unread
- **Medium** — unread, no keyword match
- **Low** — read or no keyword match

## Widgets

| Widget | Config Fields | Data Source |
|--------|--------------|-------------|
| Clock | timezone | None |
| Note | title, content | localStorage |
| Anime Tracker | — | AniList GraphQL (no key) |
| Gmail | title | Google OAuth → Gmail API |
| Weather | latitude, longitude | Open-Meteo (no key) |
| Pomodoro | workMinutes, breakMinutes | None (timer) |
| Markdown | content | localStorage |
| Kanban | columns | localStorage |
| RSS Feed | feeds[] | RSS proxy → `/api/rss` |
| GitHub Activity | username | GitHub API → `/api/github` |

## Tech Stack

- **Next.js 14** (App Router) — framework
- **React 18** — UI
- **TypeScript 5** — types
- **TailwindCSS** — base styling
- **Zustand** — state management
- **TanStack Query** — data fetching with caching
- **React Grid Layout** — drag/resize grid
- **better-sqlite3** — token storage
- **jose** — JWT sessions
- **googleapis** — Gmail OAuth
- **AniList GraphQL** — anime data
- **lucide-react** — icons

## Folder Structure

```
src/
  app/
    api/              # API routes (auth, gmail, rss, github, health)
    globals.css       # Design tokens + component styles
    page.tsx          # Main page
  components/         # Shared UI
    Toolbar.tsx         # Top bar (dashboard switcher, edit, add, settings)
    WidgetWrapper.tsx   # Widget chrome (remove, resize, config, permissions)
    WidgetConfigPanel.tsx
    WidgetPermissionsPanel.tsx
    DashboardSettingsPanel.tsx
    DashboardCanvas.tsx
    ThemeApplier.tsx
  renderer/           # Grid layout → widget mounting
  widgets/
    clock/            # Live clock
    text/             # Editable note
    anime/            # AniList tracker
    gmail/            # Gmail inbox (7 sub-components)
    weather/          # Open-Meteo weather
    pomodoro/         # Focus timer
    markdown/         # Markdown editor
    kanban/           # 3-column board
    rss/              # RSS feed reader
    github/           # GitHub activity feed
  lib/                # Shared utilities
    crypto.ts           # AES-256-GCM encryption
    session.ts          # JWT management
    tokenStore.ts       # Encrypted SQLite token persistence
    gmailClient.ts      # Gmail API + urgency classification
    googleAuth.ts       # Google OAuth2 client
    rateLimit.ts        # IP-based rate limiter
    db.ts               # SQLite connection
    env.ts              # Environment validation
    storage/            # Storage provider abstraction
  registry/           # Widget registry singleton
  store/              # Zustand store + actions
  services/           # External API clients (AniList)
  types/              # Shared TypeScript interfaces
```

## Testing

```bash
# Backend API tests
python3 test.py

# Or with a custom URL
python3 test.py http://your-host:3000
```
