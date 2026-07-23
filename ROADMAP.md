# Dashboard — Roadmap & Next Iterations

## Current Status (as of Jul 2026)

- **Committed:** Phases 2A, 2B, 3A, 3B, 4A, 5A (partial)
- **Not started:** Remaining 5A widgets, 5B, 6, 7

### Completed
- [x] Phase 2A: Lazy Loading + Dynamic Imports
- [x] Phase 2B: Storage Provider Abstraction
- [x] Phase 3A: Widget Configuration Panel (auto-generated from `configurationSchema`)
- [x] Phase 3B: Dashboard Settings UI (theme picker, accent presets, grid config, duplicate)
- [x] Phase 4A: Widget Permissions (visibility/mode selectors, shield badge, permissions panel)
- [x] Phase 5A: Weather widget (Open-Meteo, geolocation or manual coords)
- [x] Phase 5A: Pomodoro timer (focus/break cycles, session counter)
- [x] Phase 5A: Markdown renderer (lightweight custom parser)
- [x] Phase 5A: Kanban board (3-column, drag-ready)
- [x] Phase 5A: RSS feed reader (multi-feed tabs, API proxy)
- [x] Phase 5A: GitHub activity (public events feed)

---

## Phase 5 — New Widgets (remaining)

### 5A: Quick Win Widgets (remaining)
- [x] Markdown renderer
- [x] Kanban board (localStorage-backed)
- [x] RSS feed reader (with API proxy)
- [x] GitHub activity (public API, no auth needed)

### 5B: Data-Heavy Widgets
- [ ] Spotify now-playing (OAuth)
- [ ] Calendar integration (Google Calendar API)
- [ ] Finance/stocks tracker
- [ ] Others per roadmap in `next_prompt.md`

---

## Phase 6 — Social Foundation

### 6A: User Profiles + Friend System
- [ ] User registration/auth beyond Google OAuth
- [ ] Profile pages
- [ ] Friend requests and friend list

### 6B: Dashboard Sharing
- [ ] Share specific dashboards or individual widgets with friends
- [ ] Read-only or collaborative access control

---

## Phase 7 — Real-Time Collaboration

### 7A: Collaboration Layer
- [ ] WebSocket server
- [ ] CRDT-based state sync
- [ ] Live cursors and presence indicators

---

## Code Quality / Infrastructure (parallel track)

### 10. Testing (zero coverage currently)
- [x] Set up Vitest
- [x] Unit tests for: storage providers (9), persistence service (8), crypto (7), session (5), rate limiting (4), widget registry (10)
- [ ] Integration tests for API routes

### 11. Gmail widget refactor
- [x] 494-line monolith in `src/widgets/gmail/index.tsx`
- [x] Split into sub-components: ConnectScreen, EmailRow, EmailDetail, FilterTabs, ErrorScreen, UrgencyBadge

### 12. Email body loading
- [x] Detail view now fetches full body via `/api/gmail/messages/:id`
- [x] Falls back to snippet on error

### 13. README / docs update
- [x] Docs reference v2 schema — update for v2 multi-dashboard, widget instances
- [x] Add API route documentation for all 6 routes

### 14. Production readiness
- [x] Error boundaries per-widget (`WidgetErrorBoundary`)
- [x] Loading skeleton for lazy-loaded widgets
- [ ] In-memory rate limiting / cache needs Redis for multi-instance
- [ ] Improve loading states and error states across widgets

---

## Recommended Next Steps

1. ~~Phase 5A~~ ✅ — All 6 quick-win widgets done
2. ~~Phase 11~~ ✅ — Gmail refactor done
3. ~~Phase 12~~ ✅ — Email body loading done
4. ~~Phase 10~~ ✅ — Vitest setup + 43 unit tests
5. ~~Phase 13~~ ✅ — README + API docs updated
6. ~~Phase 14~~ ✅ — Error boundaries + loading skeleton
7. **Phase 5B** — Data-heavy widgets (Spotify, Calendar, Finance)
8. Then proceed to 6, 7 as desired
