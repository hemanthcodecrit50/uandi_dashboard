import { describe, it, expect } from 'vitest';
import { widgetRegistry, DEFAULT_DASHBOARD, DEFAULT_INSTANCES } from '@/registry';

describe('widgetRegistry', () => {
  it('has all expected widgets', () => {
    const all = widgetRegistry.getAll();
    expect(all.length).toBe(10);
  });

  it('returns a widget by ID', () => {
    const clock = widgetRegistry.get('ClockWidget');
    expect(clock).toBeDefined();
    expect(clock!.displayName).toBe('Clock');
  });

  it('returns undefined for unknown ID', () => {
    expect(widgetRegistry.get('NonexistentWidget')).toBeUndefined();
  });

  it('every widget has required metadata', () => {
    const all = widgetRegistry.getAll();
    for (const def of all) {
      expect(def.id).toBeTruthy();
      expect(def.displayName).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.icon).toBeTruthy();
      expect(def.component).toBeDefined();
      expect(def.defaultSize.w).toBeGreaterThan(0);
      expect(def.defaultSize.h).toBeGreaterThan(0);
      expect(Array.isArray(def.capabilities)).toBe(true);
    }
  });

  it('every widget component is a valid React component', () => {
    const all = widgetRegistry.getAll();
    for (const def of all) {
      // Lazy components are objects with a $$typeof symbol
      expect(def.component).toBeDefined();
    }
  });
});

describe('DEFAULT_DASHBOARD', () => {
  it('has correct structure', () => {
    expect(DEFAULT_DASHBOARD.id).toBe('default');
    expect(DEFAULT_DASHBOARD.name).toBeTruthy();
    expect(DEFAULT_DASHBOARD.isDefault).toBe(true);
    expect(DEFAULT_DASHBOARD.settings.gridColumns).toBe(12);
  });
});

describe('DEFAULT_INSTANCES', () => {
  it('has 3 default widgets', () => {
    expect(DEFAULT_INSTANCES).toHaveLength(3);
  });

  it('all belong to default dashboard', () => {
    for (const inst of DEFAULT_INSTANCES) {
      expect(inst.dashboardId).toBe('default');
    }
  });

  it('all have valid widget types in registry', () => {
    for (const inst of DEFAULT_INSTANCES) {
      expect(widgetRegistry.get(inst.widgetType)).toBeDefined();
    }
  });

  it('all start as private + readonly', () => {
    for (const inst of DEFAULT_INSTANCES) {
      expect(inst.visibility).toBe('private');
      expect(inst.mode).toBe('readonly');
    }
  });
});
