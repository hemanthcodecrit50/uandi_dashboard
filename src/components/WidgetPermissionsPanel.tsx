'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store';
import type { WidgetVisibility, WidgetMode } from '@/types';
import { Lock, Users, Globe, Eye, Pencil, Shield, X } from 'lucide-react';

interface WidgetPermissionsPanelProps {
  instanceId: string;
  onClose: () => void;
}

const VISIBILITY_OPTIONS: { value: WidgetVisibility; label: string; icon: typeof Lock; desc: string }[] = [
  { value: 'private', label: 'Private', icon: Lock, desc: 'Only you' },
  { value: 'friends', label: 'Friends', icon: Users, desc: 'Friends list' },
  { value: 'public', label: 'Public', icon: Globe, desc: 'Everyone' },
];

const MODE_OPTIONS: { value: WidgetMode; label: string; icon: typeof Eye; desc: string }[] = [
  { value: 'readonly', label: 'View Only', icon: Eye, desc: 'No editing' },
  { value: 'collaborative', label: 'Collaborative', icon: Pencil, desc: 'Anyone can edit' },
];

export default function WidgetPermissionsPanel({ instanceId, onClose }: WidgetPermissionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const widget = useDashboardStore((s) => s.widgets.find((w) => w.instanceId === instanceId));
  const updateWidgetVisibility = useDashboardStore((s) => s.updateWidgetVisibility);
  const updateWidgetMode = useDashboardStore((s) => s.updateWidgetMode);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!widget) return null;

  return (
    <div ref={panelRef} className="permissions-panel">
      <div className="permissions-panel-header">
        <Shield size={13} color="var(--accent)" />
        <span className="permissions-panel-title">Permissions</span>
        <button onClick={onClose} className="config-panel-close">
          <X size={12} />
        </button>
      </div>

      <div className="permissions-panel-body">
        <div className="permissions-section">
          <span className="permissions-section-label">Visibility</span>
          <div className="permissions-options">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = widget.visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateWidgetVisibility(instanceId, opt.value)}
                  className={`permissions-option ${active ? 'permissions-option--active' : ''}`}
                >
                  <Icon size={14} />
                  <div className="permissions-option-text">
                    <span className="permissions-option-label">{opt.label}</span>
                    <span className="permissions-option-desc">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="permissions-section">
          <span className="permissions-section-label">Access</span>
          <div className="permissions-options">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = widget.mode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateWidgetMode(instanceId, opt.value)}
                  className={`permissions-option ${active ? 'permissions-option--active' : ''}`}
                >
                  <Icon size={14} />
                  <div className="permissions-option-text">
                    <span className="permissions-option-label">{opt.label}</span>
                    <span className="permissions-option-desc">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
