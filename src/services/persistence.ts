import { DashboardSchema, LegacyDashboardSchema, WidgetInstance, Dashboard } from '@/types';
import { DEFAULT_DASHBOARD, DEFAULT_INSTANCES } from '@/registry';
import type { StorageProvider } from '@/lib/storage';
import { LocalStorageProvider } from '@/lib/storage';

const STORAGE_KEY = 'dashboard_layout_v2';
const LEGACY_STORAGE_KEY = 'dashboard_layout_v1';
const SCHEMA_VERSION = '2.0.0';

// ─── Provider ─────────────────────────────────────────────────────────────────
// Swap this at runtime to change the storage backend without touching
// any other code. The UI and store never import localStorage directly.

let provider: StorageProvider = new LocalStorageProvider();

export function setStorageProvider(p: StorageProvider): void {
  provider = p;
}

export function getStorageProvider(): StorageProvider {
  return provider;
}

// ─── Migration ────────────────────────────────────────────────────────────────

function migrateV1(legacy: LegacyDashboardSchema): DashboardSchema {
  const instances: WidgetInstance[] = legacy.widgets.map((w) => ({
    instanceId: w.id,
    widgetType: w.component,
    dashboardId: 'default',
    layout: w.layout,
    configuration: w.config,
    visibility: 'private' as const,
    mode: 'readonly' as const,
  }));

  return {
    version: SCHEMA_VERSION,
    dashboards: [DEFAULT_DASHBOARD],
    instances,
  };
}

// ─── Core persistence ─────────────────────────────────────────────────────────

export function loadSchema(): DashboardSchema {
  try {
    const raw = provider.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardSchema;
      if (Array.isArray(parsed.instances) && Array.isArray(parsed.dashboards)) {
        return parsed;
      }
    }
  } catch {
    // corrupted storage — fall through to migration/defaults
  }

  // Attempt migration from v1
  try {
    const legacyRaw = provider.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy: LegacyDashboardSchema = JSON.parse(legacyRaw);
      if (Array.isArray(legacy.widgets)) {
        const migrated = migrateV1(legacy);
        saveSchema(migrated);
        provider.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
    }
  } catch {
    // corrupted legacy storage — fall through to defaults
  }

  // Persist the default schema so a hard-refresh doesn't re-seed unnecessarily
  const fallback: DashboardSchema = {
    version: SCHEMA_VERSION,
    dashboards: [DEFAULT_DASHBOARD],
    instances: DEFAULT_INSTANCES,
  };
  saveSchema(fallback);
  return fallback;
}

export function saveSchema(schema: Omit<DashboardSchema, 'version'>): void {
  try {
    provider.setItem(STORAGE_KEY, JSON.stringify({ ...schema, version: SCHEMA_VERSION }));
  } catch (e) {
    console.error('[dashboard] Failed to persist layout', e);
  }
}

// ─── Serialization (pure, no storage dependency) ──────────────────────────────

export function parseSchema(json: string): DashboardSchema {
  const parsed = JSON.parse(json) as DashboardSchema | LegacyDashboardSchema;
  if ('widgets' in parsed && Array.isArray(parsed.widgets)) {
    return migrateV1(parsed as LegacyDashboardSchema);
  }
  if ('instances' in parsed && Array.isArray(parsed.instances)) {
    return parsed as DashboardSchema;
  }
  throw new Error('Invalid schema: missing instances or widgets array');
}

export function serialiseSchema(dashboards: Dashboard[], instances: WidgetInstance[]): string {
  return JSON.stringify({ version: SCHEMA_VERSION, dashboards, instances }, null, 2);
}
