import type { ComponentType } from 'react';

// ─── Widget Capabilities ──────────────────────────────────────────────────────

export type WidgetCapability =
  | 'shareable'
  | 'collaborative'
  | 'exportable'
  | 'searchable'
  | 'realtime'
  | 'configurable';

// ─── Configuration Schema ─────────────────────────────────────────────────────

export interface ConfigurationField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color';
  defaultValue: unknown;
  placeholder?: string;
  options?: { label: string; value: unknown }[];
}

export interface ConfigurationSchema {
  fields: ConfigurationField[];
}

// ─── Widget Contract ──────────────────────────────────────────────────────────

export interface WidgetProps {
  id: string;
  config: Record<string, unknown>;
}

export interface WidgetDefinition {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  component: ComponentType<WidgetProps>;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  capabilities: WidgetCapability[];
  configurationSchema?: ConfigurationSchema;
  tags?: string[];
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// ─── Widget Instance ──────────────────────────────────────────────────────────

export type WidgetVisibility = 'private' | 'friends' | 'public';
export type WidgetMode = 'readonly' | 'collaborative';

export interface WidgetInstance {
  instanceId: string;
  widgetType: string;
  dashboardId: string;
  layout: WidgetLayout;
  configuration: Record<string, unknown>;
  visibility: WidgetVisibility;
  mode: WidgetMode;
  dataSourceId?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardTheme {
  backgroundColor?: string;
  accentColor?: string;
}

export interface DashboardSettings {
  gridColumns?: number;
  gridRowHeight?: number;
  compactType?: 'vertical' | 'horizontal' | null;
}

export interface Dashboard {
  id: string;
  name: string;
  icon?: string;
  theme?: DashboardTheme;
  settings: DashboardSettings;
  isDefault: boolean;
}

// ─── Persistence Schema ───────────────────────────────────────────────────────

export interface DashboardSchema {
  version: string;
  dashboards: Dashboard[];
  instances: WidgetInstance[];
}

// ─── Legacy Types (for backward compatibility during migration) ────────────────

export interface LegacyWidgetNode {
  id: string;
  component: string;
  layout: WidgetLayout;
  config: Record<string, unknown>;
}

export interface LegacyDashboardSchema {
  version: string;
  widgets: LegacyWidgetNode[];
}
