import { DashboardSchema, WidgetNode } from '@/types';
import { DEFAULT_WIDGETS } from '@/registry';

const STORAGE_KEY = 'dashboard_layout_v1';
const SCHEMA_VERSION = '1.0.0';

export function loadSchema(): DashboardSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: DashboardSchema = JSON.parse(raw);
      if (Array.isArray(parsed.widgets)) return parsed;
    }
  } catch {
    // corrupted storage — fall through to defaults
  }
  // Persist the default schema so a hard-refresh doesn't re-seed unnecessarily
  // and so a corrupted save self-heals on the next load.
  const fallback: DashboardSchema = { version: SCHEMA_VERSION, widgets: DEFAULT_WIDGETS };
  saveSchema(DEFAULT_WIDGETS);
  return fallback;
}

export function saveSchema(widgets: WidgetNode[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, widgets }));
  } catch (e) {
    console.error('[dashboard] Failed to persist layout', e);
  }
}

export function parseSchema(json: string): DashboardSchema {
  const parsed: DashboardSchema = JSON.parse(json); // let caller catch
  if (!Array.isArray(parsed.widgets)) throw new Error('Missing widgets array');
  return parsed;
}

export function serialiseSchema(widgets: WidgetNode[]): string {
  return JSON.stringify({ version: SCHEMA_VERSION, widgets }, null, 2);
}
