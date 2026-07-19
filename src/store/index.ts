import { create } from 'zustand';
import { WidgetInstance, Dashboard, DashboardTheme, DashboardSettings, WidgetVisibility, WidgetMode } from '@/types';
import { widgetRegistry } from '@/registry';
import { DEFAULT_DASHBOARD } from '@/registry';
import { loadSchema, saveSchema, parseSchema, serialiseSchema } from '@/services/persistence';

interface DashboardStore {
  dashboards: Dashboard[];
  currentDashboardId: string;
  widgets: WidgetInstance[];
  isEditMode: boolean;

  currentDashboard(): Dashboard | undefined;
  currentWidgets(): WidgetInstance[];

  setEditMode(value: boolean): void;

  // Dashboard CRUD
  createDashboard(name: string): void;
  deleteDashboard(id: string): void;
  switchDashboard(id: string): void;
  renameDashboard(id: string, name: string): void;
  duplicateDashboard(id: string): void;
  updateDashboardTheme(id: string, theme: DashboardTheme): void;
  updateDashboardSettings(id: string, settings: Partial<DashboardSettings>): void;

  // Widget CRUD (scoped to current dashboard)
  addWidget(widgetType: string): void;
  removeWidget(instanceId: string): void;
  moveWidget(instanceId: string, x: number, y: number): void;
  resizeWidget(instanceId: string, w: number, h: number): void;
  resizeWidgetBy(instanceId: string, dw: number, dh: number): void;
  updateWidgetConfig(instanceId: string, patch: Record<string, unknown>): void;
  updateWidgetVisibility(instanceId: string, visibility: WidgetVisibility): void;
  updateWidgetMode(instanceId: string, mode: WidgetMode): void;

  // Persistence
  loadLayout(): void;
  exportLayout(): string;
  importLayout(json: string): void;
}

// Must match the GridLayout `cols` in the renderer.
const GRID_COLS = 12;
const MAX_ROWS = 16;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

let idCounter = Date.now();
const generateId = () => `w_${(++idCounter).toString(36)}`;
const generateDashboardId = () => `dash_${(++idCounter).toString(36)}`;

function patchById(
  widgets: WidgetInstance[],
  instanceId: string,
  updater: (w: WidgetInstance) => WidgetInstance,
): WidgetInstance[] {
  return widgets.map((w) => (w.instanceId === instanceId ? updater(w) : w));
}

function persist(state: { dashboards: Dashboard[]; widgets: WidgetInstance[] }) {
  saveSchema({ dashboards: state.dashboards, instances: state.widgets });
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  dashboards: [],
  currentDashboardId: 'default',
  widgets: [],
  isEditMode: false,

  currentDashboard() {
    return get().dashboards.find((d) => d.id === get().currentDashboardId);
  },

  currentWidgets() {
    const dashId = get().currentDashboardId;
    return get().widgets.filter((w) => w.dashboardId === dashId);
  },

  setEditMode(value) {
    set({ isEditMode: value });
  },

  // ── Dashboard CRUD ──────────────────────────────────────────────────────

  createDashboard(name) {
    const newDashboard: Dashboard = {
      id: generateDashboardId(),
      name,
      settings: {
        gridColumns: 12,
        gridRowHeight: 60,
        compactType: 'vertical',
      },
      isDefault: false,
    };
    const next = [...get().dashboards, newDashboard];
    set({ dashboards: next, currentDashboardId: newDashboard.id, isEditMode: false });
    persist(get());
  },

  deleteDashboard(id) {
    const { dashboards, widgets, currentDashboardId } = get();
    const target = dashboards.find((d) => d.id === id);
    if (!target || target.isDefault) return;

    const nextDashboards = dashboards.filter((d) => d.id !== id);
    const nextWidgets = widgets.filter((w) => w.dashboardId !== id);
    const nextCurrentId = currentDashboardId === id ? 'default' : currentDashboardId;

    set({
      dashboards: nextDashboards,
      widgets: nextWidgets,
      currentDashboardId: nextCurrentId,
      isEditMode: false,
    });
    persist(get());
  },

  switchDashboard(id) {
    if (get().currentDashboardId === id) return;
    set({ currentDashboardId: id, isEditMode: false });
  },

  renameDashboard(id, name) {
    const next = get().dashboards.map((d) =>
      d.id === id ? { ...d, name } : d,
    );
    set({ dashboards: next });
    persist(get());
  },

  duplicateDashboard(id) {
    const source = get().dashboards.find((d) => d.id === id);
    if (!source) return;
    const newId = generateDashboardId();
    const dup: Dashboard = {
      ...source,
      id: newId,
      name: `${source.name} (copy)`,
      isDefault: false,
      theme: source.theme ? { ...source.theme } : undefined,
      settings: { ...source.settings },
    };
    const dupWidgets = get().widgets
      .filter((w) => w.dashboardId === id)
      .map((w) => ({
        ...w,
        instanceId: generateId(),
        dashboardId: newId,
        configuration: { ...w.configuration },
      }));
    set({
      dashboards: [...get().dashboards, dup],
      widgets: [...get().widgets, ...dupWidgets],
      currentDashboardId: newId,
    });
    persist(get());
  },

  updateDashboardTheme(id, theme) {
    const next = get().dashboards.map((d) =>
      d.id === id ? { ...d, theme: { ...d.theme, ...theme } } : d,
    );
    set({ dashboards: next });
    persist(get());
  },

  updateDashboardSettings(id, settings) {
    const next = get().dashboards.map((d) =>
      d.id === id ? { ...d, settings: { ...d.settings, ...settings } } : d,
    );
    set({ dashboards: next });
    persist(get());
  },

  // ── Widget CRUD ─────────────────────────────────────────────────────────

  addWidget(widgetType) {
    const def = widgetRegistry.get(widgetType);
    if (!def) {
      console.warn(`[dashboard] addWidget: unknown widget type "${widgetType}"`);
      return;
    }
    const instance: WidgetInstance = {
      instanceId: generateId(),
      widgetType,
      dashboardId: get().currentDashboardId,
      layout: {
        x: 0,
        y: Infinity,
        w: def.defaultSize.w,
        h: def.defaultSize.h,
        minW: def.minSize?.w,
        minH: def.minSize?.h,
      },
      configuration: {},
      visibility: 'private',
      mode: 'readonly',
    };
    const next = [...get().widgets, instance];
    set({ widgets: next });
    persist(get());
  },

  removeWidget(instanceId) {
    const next = get().widgets.filter((w) => w.instanceId !== instanceId);
    set({ widgets: next });
    persist(get());
  },

  moveWidget(instanceId, x, y) {
    const next = patchById(get().widgets, instanceId, (w) => ({
      ...w, layout: { ...w.layout, x, y },
    }));
    set({ widgets: next });
    persist(get());
  },

  resizeWidget(instanceId, w, h) {
    const next = patchById(get().widgets, instanceId, (widget) => ({
      ...widget, layout: { ...widget.layout, w, h },
    }));
    set({ widgets: next });
    persist(get());
  },

  resizeWidgetBy(instanceId, dw, dh) {
    const next = patchById(get().widgets, instanceId, (widget) => {
      const { layout } = widget;
      const minW = layout.minW ?? 2;
      const minH = layout.minH ?? 2;
      const w = clamp(layout.w + dw, minW, GRID_COLS);
      const h = clamp(layout.h + dh, minH, MAX_ROWS);
      return { ...widget, layout: { ...layout, w, h } };
    });
    set({ widgets: next });
    persist(get());
  },

  updateWidgetConfig(instanceId, patch) {
    const next = patchById(get().widgets, instanceId, (w) => ({
      ...w, configuration: { ...w.configuration, ...patch },
    }));
    set({ widgets: next });
    persist(get());
  },

  updateWidgetVisibility(instanceId, visibility) {
    const next = patchById(get().widgets, instanceId, (w) => ({ ...w, visibility }));
    set({ widgets: next });
    persist(get());
  },

  updateWidgetMode(instanceId, mode) {
    const next = patchById(get().widgets, instanceId, (w) => ({ ...w, mode }));
    set({ widgets: next });
    persist(get());
  },

  // ── Persistence ─────────────────────────────────────────────────────────

  loadLayout() {
    const schema = loadSchema();
    set({
      dashboards: schema.dashboards,
      currentDashboardId: schema.dashboards[0]?.id ?? 'default',
      widgets: schema.instances,
    });
  },

  exportLayout() {
    return serialiseSchema(get().dashboards, get().widgets);
  },

  importLayout(json) {
    try {
      const schema = parseSchema(json);
      set({
        dashboards: schema.dashboards,
        currentDashboardId: schema.dashboards[0]?.id ?? 'default',
        widgets: schema.instances,
      });
      persist(get());
    } catch (e) {
      console.error('[dashboard] Import failed', e);
      alert('Invalid layout file — could not import.');
    }
  },
}));
