import { create } from 'zustand';
import { WidgetNode } from '@/types';
import { widgetRegistry } from '@/registry';
import { loadSchema, saveSchema, parseSchema, serialiseSchema } from '@/services/persistence';

interface DashboardStore {
  widgets: WidgetNode[];
  isEditMode: boolean;

  setEditMode(value: boolean): void;
  // Store resolves the widget definition itself — callers only pass an ID.
  addWidget(componentId: string): void;
  removeWidget(id: string): void;
  // Single-item positional updates (drag / resize).
  moveWidget(id: string, x: number, y: number): void;
  resizeWidget(id: string, w: number, h: number): void;
  // Relative resize from UI controls (buttons). Clamps to grid + widget bounds.
  resizeWidgetBy(id: string, dw: number, dh: number): void;
  updateWidgetConfig(id: string, patch: Record<string, unknown>): void;
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

function patchById(
  widgets: WidgetNode[],
  id: string,
  updater: (w: WidgetNode) => WidgetNode,
): WidgetNode[] {
  return widgets.map((w) => (w.id === id ? updater(w) : w));
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  widgets: [],
  isEditMode: false,

  setEditMode(value) {
    set({ isEditMode: value });
  },

  // Registry lookup is the store's responsibility, not the caller's.
  // Toolbar calls addWidget('ClockWidget') — nothing else.
  addWidget(componentId) {
    const def = widgetRegistry.get(componentId);
    if (!def) {
      console.warn(`[dashboard] addWidget: unknown component "${componentId}"`);
      return;
    }
    const widget: WidgetNode = {
      id: generateId(),
      component: componentId,
      layout: {
        x: 0,
        y: Infinity, // react-grid-layout places it at the bottom
        w: def.defaultSize.w,
        h: def.defaultSize.h,
        minW: def.minSize?.w,
        minH: def.minSize?.h,
      },
      config: {},
    };
    const next = [...get().widgets, widget];
    set({ widgets: next });
    saveSchema(next);
  },

  removeWidget(id) {
    const next = get().widgets.filter((w) => w.id !== id);
    set({ widgets: next });
    saveSchema(next);
  },

  // Dedicated single-item updaters — no index building, no iteration overhead
  // beyond the single map pass that patchById does.
  moveWidget(id, x, y) {
    const next = patchById(get().widgets, id, (w) => ({
      ...w, layout: { ...w.layout, x, y },
    }));
    set({ widgets: next });
    saveSchema(next);
  },

  resizeWidget(id, w, h) {
    const next = patchById(get().widgets, id, (widget) => ({
      ...widget, layout: { ...widget.layout, w, h },
    }));
    set({ widgets: next });
    saveSchema(next);
  },

  // Step the size by whole grid cells, clamped to [minW..GRID_COLS] / [minH..MAX_ROWS].
  resizeWidgetBy(id, dw, dh) {
    const next = patchById(get().widgets, id, (widget) => {
      const { layout } = widget;
      const minW = layout.minW ?? 2;
      const minH = layout.minH ?? 2;
      const w = clamp(layout.w + dw, minW, GRID_COLS);
      const h = clamp(layout.h + dh, minH, MAX_ROWS);
      return { ...widget, layout: { ...layout, w, h } };
    });
    set({ widgets: next });
    saveSchema(next);
  },

  updateWidgetConfig(id, patch) {
    const next = patchById(get().widgets, id, (w) => ({
      ...w, config: { ...w.config, ...patch },
    }));
    set({ widgets: next });
    saveSchema(next);
  },

  loadLayout() {
    const schema = loadSchema();
    set({ widgets: schema.widgets });
  },

  exportLayout() {
    return serialiseSchema(get().widgets);
  },

  importLayout(json) {
    try {
      const schema = parseSchema(json);
      set({ widgets: schema.widgets });
      saveSchema(schema.widgets);
    } catch (e) {
      console.error('[dashboard] Import failed', e);
      alert('Invalid layout file — could not import.');
    }
  },
}));
