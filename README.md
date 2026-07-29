# Personal Dashboard

A runtime-configurable personal dashboard inspired by Glance, Homepage, and Notion — with an optional layer for publishing a dashboard, adding friends, and sharing/collaborating on it in real time (via polling).

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
| `GOOGLE_CLIENT_ID` | For Gmail widget + friends/sharing | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Gmail widget + friends/sharing | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For Gmail widget + friends/sharing | e.g. `http://localhost:3000/api/auth/callback` |
| `SESSION_SECRET` | For Gmail widget + friends/sharing | Random string, min 32 chars |
| `TOKEN_ENCRYPTION_KEY` | For Gmail widget + friends/sharing | 64-char hex string (32 bytes) |
| `DB_PATH` | No | SQLite path (default: `./data/dashboard.db`) |

Widgets like Clock, Weather, Pomodoro, Markdown, Kanban, RSS, and GitHub work without any env vars — your layout stays entirely in `localStorage`. Signing in with Google additionally unlocks Gmail, friends, and dashboard sharing (all backed by the same SQLite database).

## Features

- **10 Widgets** — Clock, Note, Anime Tracker, Gmail, Weather, Pomodoro, Markdown, Kanban, RSS, GitHub
- **Edit Mode** — drag to move, resize from any of the 4 corners, delete widgets. Right-click any widget to enter edit mode; press `Esc` to leave it.
- **Widget Configuration** — auto-generated settings forms per widget; text/number fields commit on blur or Enter rather than on every keystroke, so fields that drive a live fetch (GitHub username, Weather lat/long) don't fire a request per character typed.
- **Widget Permissions** — visibility (private/friends/public) and mode (readonly/collaborative), enforced server-side once a dashboard is shared (see Collaboration below).
- **Dashboard Settings** — theme picker, accent colors, grid columns/height, duplicate dashboard
- **Multi-Dashboard** — create, rename, switch, delete dashboards
- **Persistent Layout** — all changes save to `localStorage` automatically; optionally publish a dashboard to the server to share it
- **Export/Import** — export as **layout only** (widgets + positions, no content) or **layout + data** (includes widget content); import either back in
- **Friends** — search users by name/email, send/accept/reject friend requests, unfriend
- **Dashboard Sharing** — publish a dashboard, share it with a friend (view or edit) or via an unguessable public link, and collaboratively edit shared widgets — changes sync to other viewers every few seconds via polling

## Architecture

```
Schema v2 (JSON)
  → Store (Zustand)
    → Renderer (React Grid Layout)
      → Widget Registry (lazy-loaded components)
        → Widget Components

Collaboration (opt-in, server-backed):
  Publish → SQLite (dashboards, widget_instances, dashboard_shares)
    → Access control (owner / editor / viewer, visibility filtering)
      → /shared/[dashboardId] (polling viewer, 4s interval)
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
| `GET` | `/api/auth/callback` | No | — | OAuth callback (token exchange, upserts user row) |
| `GET` | `/api/auth/me` | Session | — | Get current user profile |
| `POST` | `/api/auth/logout` | Session | — | Delete tokens, clear session |
| `GET` | `/api/gmail/messages` | Session | 10/user/min | Fetch inbox (urgency-classified) |
| `GET` | `/api/gmail/messages/:id` | Session | 10/user/min | Fetch full email body |
| `GET` | `/api/rss?url=...` | No | 20/IP/min | Fetch and parse RSS feed |
| `GET` | `/api/github?username=...` | No | 20/IP/min | GitHub user + events |
| `GET` | `/api/users/search?q=...` | Session | 20/user/min | Search users by name/email (for adding friends) |
| `GET` | `/api/friends` | Session | — | List friends + incoming/outgoing requests |
| `POST` | `/api/friends/request` | Session | 20/user/min | Send a friend request by email |
| `POST` | `/api/friends/respond` | Session | — | Accept/reject a friend request |
| `DELETE` | `/api/friends/:friendshipId` | Session | — | Unfriend, or cancel an outgoing request |
| `POST` | `/api/dashboards/publish` | Session | — | Publish/update a dashboard + its widgets to the server |
| `GET` | `/api/dashboards/mine` | Session | — | List dashboards you've published |
| `GET` | `/api/dashboards/shared-with-me` | Session | — | List dashboards friends shared with you |
| `GET` | `/api/dashboards/:id?token=` | Session or public token | — | Fetch a dashboard (access-checked, visibility-filtered) |
| `PATCH` | `/api/dashboards/:id` | Session | — | Apply collaborative edits to widget configuration |
| `DELETE` | `/api/dashboards/:id` | Session (owner) | — | Unpublish a dashboard |
| `GET`/`POST` | `/api/dashboards/:id/share` | Session (owner) | — | List / create shares (friend-targeted or public link) |
| `DELETE` | `/api/dashboards/:id/share/:shareId` | Session (owner) | — | Revoke a share |

### Gmail Urgency Classification

Server-side regex-based, never exposed to client:

- **Critical** — "urgent", "asap", "critical", "emergency", "action required"
- **High** — "deadline", "important", "approval", "follow-up" + unread
- **Medium** — unread, no keyword match
- **Low** — read or no keyword match

## Collaboration

Sharing is entirely opt-in and layered on top of the local-first model — a dashboard lives only in `localStorage` until you explicitly publish it.

1. **Identity.** Signing in with Google creates a row in a `users` table keyed by the Google account's stable `sub`, independent of the Gmail-specific token storage.
2. **Friends.** A `friendships` table (`pending`/`accepted`) backs search-by-email, send/accept/reject, and unfriend. Sending a request when the other person already has a pending request to you auto-accepts.
3. **Publish.** `POST /api/dashboards/publish` takes the exact JSON your Export button produces (one dashboard + its widgets) and upserts it server-side, owned by your user id.
4. **Access control** (`src/lib/serverDashboards.ts`) is share-gated, not friendship-gated: being someone's friend grants nothing by itself. A dashboard must be explicitly shared with you — directly with a friend (`view` or `edit` permission) or via an unguessable public link token — before you can see it at all. Once you have access, each widget's `visibility` (`private`/`friends`/`public`) further filters what you actually see; `private` widgets never leave the owner's view.
5. **Collaborative edits.** Non-owners with `edit` permission can only write to a widget's `configuration`, and only when that widget's `mode` is `collaborative` — layout, add/remove, and dashboard settings stay owner-only. A public link's `edit` permission is downgraded to view-only for anonymous (not-signed-in) visitors, so every edit can be attributed to a real user.
6. **Sync.** `/shared/[dashboardId]` polls the dashboard every 4 seconds via TanStack Query — the cheapest option that's good enough for "a friend updated the shared kanban board," not live cursors.

## Widgets

| Widget | Config Fields | Data Source |
|--------|--------------|-------------|
| Clock | timezone | None |
| Note | title, content | localStorage |
| Anime Tracker | — | AniList GraphQL (no key) |
| Gmail | title | Google OAuth → Gmail API |
| Weather | latitude, longitude | Open-Meteo (no key) |
| Pomodoro | workMinutes, breakMinutes | None (timer) |
| Markdown | content | localStorage · type or **import a `.md` file**; renders headers, lists, code, links, images, and GFM tables |
| Kanban | columns | localStorage · drag cards across or within columns to reorder/move |
| RSS Feed | feeds[] | RSS proxy → `/api/rss` |
| GitHub Activity | username | GitHub API → `/api/github` |

## Tech Stack

- **Next.js 14** (App Router) — framework
- **React 18** — UI
- **TypeScript 5** — types
- **TailwindCSS** — base styling
- **Zustand** — state management
- **TanStack Query** — data fetching with caching + polling
- **React Grid Layout** — drag/resize grid
- **better-sqlite3** — auth tokens, users, friendships, published dashboards
- **jose** — JWT sessions
- **googleapis** — Gmail OAuth
- **AniList GraphQL** — anime data
- **lucide-react** — icons

## Folder Structure

```
src/
  app/
    api/              # API routes (auth, gmail, rss, github, health, dashboards, friends, users)
    shared/
      [dashboardId]/    # Polling viewer for a shared dashboard
    globals.css       # Design tokens + component styles
    page.tsx          # Main page
  components/         # Shared UI
    Toolbar.tsx           # Top bar (dashboard switcher, edit, add, friends, share, settings)
    WidgetWrapper.tsx      # Widget chrome (remove, resize, config, permissions)
    WidgetConfigPanel.tsx
    WidgetPermissionsPanel.tsx
    DashboardSettingsPanel.tsx
    DashboardCanvas.tsx
    ThemeApplier.tsx
    FriendsPanel.tsx       # Search/add/accept/remove friends
    SharePanel.tsx         # Publish a dashboard, manage shares
    SharedWidgetPreview.tsx # Read-only + collaborative-edit widget preview for the shared viewer
  renderer/           # Grid layout → widget mounting
  widgets/
    clock/            # Live clock
    text/             # Editable note
    anime/            # AniList tracker
    gmail/            # Gmail inbox (7 sub-components)
    weather/          # Open-Meteo weather
    pomodoro/         # Focus timer
    markdown/         # Markdown editor (render.ts holds the pure renderer, import-free of the store)
    kanban/           # Drag-and-drop board
    rss/              # RSS feed reader
    github/           # GitHub activity feed
  hooks/
    useCurrentUser.ts     # Current session's user profile
    useSharedDashboard.ts # Polling fetch for a shared dashboard
  lib/                # Shared utilities
    crypto.ts           # AES-256-GCM encryption
    session.ts           # JWT management
    tokenStore.ts         # Encrypted SQLite token persistence
    userStore.ts           # users table CRUD + search
    friendStore.ts         # friendships table + request/accept/reject logic
    serverDashboards.ts     # Published dashboards, access control, sharing
    apiClient.ts / apiErrors.ts  # Client fetch helpers / server error → HTTP mapping
    gmailClient.ts        # Gmail API + urgency classification
    googleAuth.ts         # Google OAuth2 client
    rateLimit.ts          # IP/user-based rate limiter
    db.ts                 # SQLite connection + schema
    env.ts                # Environment validation
    storage/               # Storage provider abstraction
  registry/           # Widget registry singleton
  store/              # Zustand store + actions
  services/           # External API clients (AniList)
  types/              # Shared TypeScript interfaces
```

## Testing

```bash
npm test              # Vitest — unit tests for lib/, registry/, services/
npm run test:watch    # Watch mode

# Legacy backend API smoke test
python3 test.py
python3 test.py http://your-host:3000
```
