import React from 'react';
import type { WidgetDefinition, WidgetInstance, Dashboard } from '@/types';

// ─── Metadata imports (eager, lightweight) ────────────────────────────────────
import { metadata as clockMeta } from '@/widgets/clock';
import { metadata as textMeta } from '@/widgets/text';
import { metadata as animeMeta } from '@/widgets/anime';
import { metadata as gmailMeta } from '@/widgets/gmail';

// ─── Lazy component imports (loaded on demand) ────────────────────────────────
const LazyClockWidget = React.lazy(() => import('@/widgets/clock'));
const LazyTextWidget = React.lazy(() => import('@/widgets/text'));
const LazyAnimeWidget = React.lazy(() => import('@/widgets/anime'));
const LazyGmailWidget = React.lazy(() => import('@/widgets/gmail'));

// ─── Widget registry ──────────────────────────────────────────────────────────
// Metadata is always available for the Add Widget menu.
// Components are lazy-loaded only when placed on a dashboard.

const WIDGETS: Record<string, WidgetDefinition> = {
  [clockMeta.id]: { ...clockMeta, component: LazyClockWidget },
  [textMeta.id]: { ...textMeta, component: LazyTextWidget },
  [animeMeta.id]: { ...animeMeta, component: LazyAnimeWidget },
  [gmailMeta.id]: { ...gmailMeta, component: LazyGmailWidget },
};

// ─── Default dashboard + instances ────────────────────────────────────────────

export const DEFAULT_DASHBOARD: Dashboard = {
  id: 'default',
  name: 'My Dashboard',
  icon: 'LayoutDashboard',
  settings: {
    gridColumns: 12,
    gridRowHeight: 60,
    compactType: 'vertical',
  },
  isDefault: true,
};

export const DEFAULT_INSTANCES: WidgetInstance[] = [
  {
    instanceId: 'clock-default',
    widgetType: clockMeta.id,
    dashboardId: 'default',
    layout: { x: 0, y: 0, w: 4, h: 3 },
    configuration: {},
    visibility: 'private',
    mode: 'readonly',
  },
  {
    instanceId: 'text-default',
    widgetType: textMeta.id,
    dashboardId: 'default',
    layout: { x: 4, y: 0, w: 5, h: 3 },
    configuration: {
      title: 'Welcome',
      content: 'This is your personal dashboard.\nClick "Edit" to start customising.',
    },
    visibility: 'private',
    mode: 'readonly',
  },
  {
    instanceId: 'anime-default',
    widgetType: animeMeta.id,
    dashboardId: 'default',
    layout: { x: 0, y: 3, w: 4, h: 5 },
    configuration: {},
    visibility: 'private',
    mode: 'readonly',
  },
];

export const widgetRegistry = {
  get(id: string): WidgetDefinition | undefined {
    return WIDGETS[id];
  },
  getAll(): WidgetDefinition[] {
    return Object.values(WIDGETS);
  },
};
