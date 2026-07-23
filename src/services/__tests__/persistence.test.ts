import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryProvider } from '@/lib/storage/memory';
import { setStorageProvider } from '@/services/persistence';
import { loadSchema, saveSchema, parseSchema, serialiseSchema } from '@/services/persistence';

const SCHEMA_KEY = 'dashboard_layout_v2';
const LEGACY_KEY = 'dashboard_layout_v1';

beforeEach(() => {
  setStorageProvider(new InMemoryProvider());
});

describe('serialiseSchema / parseSchema', () => {
  it('round-trips dashboards and instances', () => {
    const dashboards = [
      { id: 'd1', name: 'Test', settings: { gridColumns: 12 }, isDefault: true },
    ];
    const instances = [
      {
        instanceId: 'w1',
        widgetType: 'ClockWidget',
        dashboardId: 'd1',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        configuration: {},
        visibility: 'private' as const,
        mode: 'readonly' as const,
      },
    ];

    const json = serialiseSchema(dashboards as any, instances as any);
    const parsed = parseSchema(json);

    expect(parsed.version).toBe('2.0.0');
    expect(parsed.dashboards).toHaveLength(1);
    expect(parsed.instances).toHaveLength(1);
    expect(parsed.instances[0].instanceId).toBe('w1');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseSchema('not json')).toThrow();
  });

  it('throws on schema without instances or widgets', () => {
    expect(() => parseSchema(JSON.stringify({ version: '2.0.0' }))).toThrow('Invalid schema');
  });

  it('migrates v1 schema on parse', () => {
    const legacy = {
      version: '1.0.0',
      widgets: [
        { id: 'old-1', component: 'ClockWidget', layout: { x: 0, y: 0, w: 4, h: 3 }, config: {} },
      ],
    };
    const parsed = parseSchema(JSON.stringify(legacy));
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.instances).toHaveLength(1);
    expect(parsed.instances[0].instanceId).toBe('old-1');
    expect(parsed.instances[0].widgetType).toBe('ClockWidget');
  });
});

describe('loadSchema / saveSchema', () => {
  it('returns defaults when storage is empty', () => {
    const schema = loadSchema();
    expect(schema.dashboards).toHaveLength(1);
    expect(schema.dashboards[0].id).toBe('default');
    expect(schema.instances).toHaveLength(3);
  });

  it('persists and loads saved data', () => {
    const dashboards = [
      { id: 'custom', name: 'Custom', settings: {}, isDefault: false },
    ];
    const instances = [
      {
        instanceId: 'w1',
        widgetType: 'ClockWidget',
        dashboardId: 'custom',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        configuration: {},
        visibility: 'private' as const,
        mode: 'readonly' as const,
      },
    ];
    saveSchema({ dashboards: dashboards as any, instances: instances as any });
    const loaded = loadSchema();
    expect(loaded.dashboards[0].id).toBe('custom');
    expect(loaded.instances).toHaveLength(1);
  });

  it('handles corrupted storage gracefully', () => {
    const provider = new InMemoryProvider();
    provider.setItem(SCHEMA_KEY, '{broken json!!');
    setStorageProvider(provider);

    const schema = loadSchema();
    expect(schema.dashboards[0].id).toBe('default');
  });

  it('migrates v1 from storage', () => {
    const provider = new InMemoryProvider();
    const legacy = {
      version: '1.0.0',
      widgets: [
        { id: 'legacy-1', component: 'TextWidget', layout: { x: 0, y: 0, w: 5, h: 3 }, config: { content: 'hi' } },
      ],
    };
    provider.setItem(LEGACY_KEY, JSON.stringify(legacy));
    setStorageProvider(provider);

    const schema = loadSchema();
    expect(schema.instances[0].widgetType).toBe('TextWidget');
    expect(schema.instances[0].configuration.content).toBe('hi');
    expect(provider.getItem(LEGACY_KEY)).toBeNull();
  });
});
