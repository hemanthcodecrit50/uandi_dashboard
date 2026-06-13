'use client';

import { useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { useDashboardStore } from '@/store';
import { widgetRegistry } from '@/registry';
import WidgetWrapper from '@/components/WidgetWrapper';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface RendererProps {
  width: number;
}

export default function Renderer({ width }: RendererProps) {
  const widgets = useDashboardStore((s) => s.widgets);
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const moveWidget = useDashboardStore((s) => s.moveWidget);
  const resizeWidget = useDashboardStore((s) => s.resizeWidget);

  const layout: Layout[] = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: w.layout.minW ?? 2,
    minH: w.layout.minH ?? 2,
    isDraggable: isEditMode,
    isResizable: isEditMode,
  }));

  // Persist only on interaction end — not on every pixel moved.
  // handleDragStop and handleResizeStop had identical bodies; unified here.
  const handleDragStop = useCallback(
    (_: Layout[], __: Layout, l: Layout) => moveWidget(l.i, l.x, l.y),
    [moveWidget],
  );

  const handleResizeStop = useCallback(
    (_: Layout[], __: Layout, l: Layout) => resizeWidget(l.i, l.w, l.h),
    [resizeWidget],
  );

  return (
    <GridLayout
      className={isEditMode ? 'edit-mode' : ''}
      layout={layout}
      cols={12}
      rowHeight={60}
      width={width}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      margin={[12, 12]}
      containerPadding={[0, 0]}
      compactType="vertical"
      draggableHandle=".drag-handle"
    >
      {widgets.map((widget) => {
        const def = widgetRegistry.get(widget.component);

        if (!def) {
          return (
            <div key={widget.id}>
              <div className="widget-card" style={{ padding: '20px' }}>
                <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>
                  Unknown widget: <code>{widget.component}</code>
                </p>
              </div>
            </div>
          );
        }

        const Component = def.component;

        return (
          <div key={widget.id}>
            {/* WidgetWrapper subscribes to the store directly for remove —
                no closure per widget, no prop drilling of removeWidget. */}
            <WidgetWrapper id={widget.id} isEditMode={isEditMode}>
              <Component id={widget.id} config={widget.config} />
            </WidgetWrapper>
          </div>
        );
      })}
    </GridLayout>
  );
}
