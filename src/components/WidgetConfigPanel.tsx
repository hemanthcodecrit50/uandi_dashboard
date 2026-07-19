'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store';
import { widgetRegistry } from '@/registry';
import type { ConfigurationField } from '@/types';
import { Settings, X } from 'lucide-react';

interface WidgetConfigPanelProps {
  instanceId: string;
  onClose: () => void;
}

function ConfigFieldInput({ field, value, onChange }: { field: ConfigurationField; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) ?? (field.defaultValue as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="config-input"
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={(value as number) ?? (field.defaultValue as number) ?? 0}
          placeholder={field.placeholder}
          onChange={(e) => onChange(Number(e.target.value))}
          className="config-input"
        />
      );
    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`config-toggle ${value ? 'config-toggle--on' : ''}`}
        >
          <div className="config-toggle-knob" />
        </button>
      );
    case 'select':
      return (
        <select
          value={(value as string) ?? (field.defaultValue as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="config-select"
        >
          {field.options?.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case 'color':
      return (
        <div className="config-color-wrap">
          <input
            type="color"
            value={(value as string) ?? (field.defaultValue as string) ?? '#7c6aff'}
            onChange={(e) => onChange(e.target.value)}
            className="config-color"
          />
          <span className="config-color-label">{(value as string) ?? (field.defaultValue as string) ?? '#7c6aff'}</span>
        </div>
      );
    default:
      return null;
  }
}

export default function WidgetConfigPanel({ instanceId, onClose }: WidgetConfigPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const widget = useDashboardStore((s) => s.widgets.find((w) => w.instanceId === instanceId));
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);

  const def = widget ? widgetRegistry.get(widget.widgetType) : undefined;
  const fields = def?.configurationSchema?.fields ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!widget || fields.length === 0) return null;

  return (
    <div ref={panelRef} className="config-panel">
      <div className="config-panel-header">
        <Settings size={13} color="var(--accent)" />
        <span className="config-panel-title">{def?.displayName ?? 'Settings'}</span>
        <button onClick={onClose} className="config-panel-close">
          <X size={12} />
        </button>
      </div>
      <div className="config-panel-body">
        {fields.map((field) => {
          const currentVal = widget.configuration[field.key] ?? field.defaultValue;
          return (
            <label key={field.key} className="config-field">
              <span className="config-label">{field.label}</span>
              <ConfigFieldInput
                field={field}
                value={currentVal}
                onChange={(v) => updateWidgetConfig(instanceId, { [field.key]: v })}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
