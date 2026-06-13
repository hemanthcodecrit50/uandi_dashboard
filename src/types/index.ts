import type { ComponentType } from 'react';

// ─── Layout & Schema ─────────────────────────────────────────────────────────

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetNode {
  id: string;
  component: string;
  layout: WidgetLayout;
  config: Record<string, unknown>;
}

export interface DashboardSchema {
  version: string;
  widgets: WidgetNode[];
}

// ─── Widget contract ──────────────────────────────────────────────────────────

export interface WidgetProps {
  id: string;
  config: Record<string, unknown>;
}

export interface WidgetDefinition {
  id: string;
  displayName: string;
  description: string;
  component: ComponentType<WidgetProps>;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
}
