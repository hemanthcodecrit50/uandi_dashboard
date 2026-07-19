'use client';

import { ReactNode, useState } from 'react';
import { useDashboardStore } from '@/store';
import { widgetRegistry } from '@/registry';
import WidgetConfigPanel from './WidgetConfigPanel';
import { X, GripVertical, Minus, Plus, Settings } from 'lucide-react';

interface WidgetWrapperProps {
  id: string;
  isEditMode: boolean;
  children: ReactNode;
}

export default function WidgetWrapper({ id, isEditMode, children }: WidgetWrapperProps) {
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const resizeWidgetBy = useDashboardStore((s) => s.resizeWidgetBy);
  const layout = useDashboardStore((s) => s.widgets.find((w) => w.instanceId === id)?.layout);
  const widgetType = useDashboardStore((s) => s.widgets.find((w) => w.instanceId === id)?.widgetType);
  const [showConfig, setShowConfig] = useState(false);

  const def = widgetType ? widgetRegistry.get(widgetType) : undefined;
  const hasConfig = (def?.configurationSchema?.fields?.length ?? 0) > 0;

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {children}

      {isEditMode && (
        <>
          <div
            className="drag-handle"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '12px',
              cursor: 'grab',
              border: '1px dashed rgba(124, 106, 255, 0.4)',
              zIndex: 5,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(124, 106, 255, 0.6)',
              zIndex: 6,
              pointerEvents: 'none',
            }}
          >
            <GripVertical size={16} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeWidget(id); }}
            title="Remove widget"
            className="widget-remove-btn"
          >
            <X size={12} />
          </button>

          {hasConfig && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfig(!showConfig); }}
              title="Configure widget"
              className={`widget-settings-btn ${showConfig ? 'widget-settings-btn--active' : ''}`}
            >
              <Settings size={12} />
            </button>
          )}

          <div className="widget-resize-bar" onMouseDown={(e) => e.stopPropagation()}>
            <div className="widget-resize-group">
              <span className="widget-resize-label">W</span>
              <button
                className="widget-resize-btn"
                title="Decrease width"
                onClick={(e) => { e.stopPropagation(); resizeWidgetBy(id, -1, 0); }}
              >
                <Minus size={11} />
              </button>
              <span className="widget-resize-val">{layout?.w ?? '–'}</span>
              <button
                className="widget-resize-btn"
                title="Increase width"
                onClick={(e) => { e.stopPropagation(); resizeWidgetBy(id, 1, 0); }}
              >
                <Plus size={11} />
              </button>
            </div>

            <div className="widget-resize-divider" />

            <div className="widget-resize-group">
              <span className="widget-resize-label">H</span>
              <button
                className="widget-resize-btn"
                title="Decrease height"
                onClick={(e) => { e.stopPropagation(); resizeWidgetBy(id, 0, -1); }}
              >
                <Minus size={11} />
              </button>
              <span className="widget-resize-val">{layout?.h ?? '–'}</span>
              <button
                className="widget-resize-btn"
                title="Increase height"
                onClick={(e) => { e.stopPropagation(); resizeWidgetBy(id, 0, 1); }}
              >
                <Plus size={11} />
              </button>
            </div>
          </div>
        </>
      )}

      {showConfig && (
        <WidgetConfigPanel instanceId={id} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
