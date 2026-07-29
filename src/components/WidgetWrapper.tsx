'use client';

import { ReactNode, useState } from 'react';
import { useDashboardStore } from '@/store';
import { widgetRegistry } from '@/registry';
import WidgetConfigPanel from './WidgetConfigPanel';
import WidgetPermissionsPanel from './WidgetPermissionsPanel';
import { X, GripVertical, Minus, Plus, Settings, Shield, Lock, Users, Globe } from 'lucide-react';
import type { WidgetVisibility } from '@/types';

interface WidgetWrapperProps {
  id: string;
  isEditMode: boolean;
  children: ReactNode;
}

const VISIBILITY_ICONS: Record<WidgetVisibility, typeof Lock> = {
  private: Lock,
  friends: Users,
  public: Globe,
};

export default function WidgetWrapper({ id, isEditMode, children }: WidgetWrapperProps) {
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const resizeWidgetBy = useDashboardStore((s) => s.resizeWidgetBy);
  const setEditMode = useDashboardStore((s) => s.setEditMode);
  const widget = useDashboardStore((s) => s.widgets.find((w) => w.instanceId === id));
  const [showConfig, setShowConfig] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const layout = widget?.layout;
  const widgetType = widget?.widgetType;
  const visibility = widget?.visibility ?? 'private';

  const def = widgetType ? widgetRegistry.get(widgetType) : undefined;
  const hasConfig = (def?.configurationSchema?.fields?.length ?? 0) > 0;

  const VisIcon = VISIBILITY_ICONS[visibility];

  // Right-click jumps straight into edit mode. Once already editing, the
  // browser's native context menu is left alone (e.g. so links/text inside
  // a widget can still be copied or opened via right-click).
  const handleContextMenu = (e: React.MouseEvent) => {
    if (isEditMode) return;
    e.preventDefault();
    setEditMode(true);
  };

  return (
    <div style={{ height: '100%', position: 'relative' }} onContextMenu={handleContextMenu}>
      {children}

      {/* Visibility badge — always visible (not just edit mode) */}
      {visibility !== 'private' && (
        <div
          className="widget-vis-badge"
          title={`Visibility: ${visibility}`}
        >
          <VisIcon size={10} />
        </div>
      )}

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

          <button
            onClick={(e) => { e.stopPropagation(); setShowPermissions(!showPermissions); setShowConfig(false); }}
            title="Permissions"
            className={`widget-permissions-btn ${showPermissions ? 'widget-permissions-btn--active' : ''}`}
          >
            <Shield size={12} />
          </button>

          {hasConfig && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfig(!showConfig); setShowPermissions(false); }}
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

      {showPermissions && (
        <WidgetPermissionsPanel instanceId={id} onClose={() => setShowPermissions(false)} />
      )}
      {showConfig && (
        <WidgetConfigPanel instanceId={id} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
