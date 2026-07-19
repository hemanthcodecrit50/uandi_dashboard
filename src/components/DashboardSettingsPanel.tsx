'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '@/store';
import { Settings, Copy, Palette, Grid3X3, X } from 'lucide-react';

interface DashboardSettingsPanelProps {
  onClose: () => void;
}

const ACCENT_PRESETS = [
  { label: 'Indigo', value: '#7c6aff' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Slate', value: '#64748b' },
];

export default function DashboardSettingsPanel({ onClose }: DashboardSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const currentDashboard = useDashboardStore((s) => s.currentDashboard());
  const updateDashboardTheme = useDashboardStore((s) => s.updateDashboardTheme);
  const updateDashboardSettings = useDashboardStore((s) => s.updateDashboardSettings);
  const duplicateDashboard = useDashboardStore((s) => s.duplicateDashboard);

  const [bgInput, setBgInput] = useState(currentDashboard?.theme?.backgroundColor ?? '');
  const [accentInput, setAccentInput] = useState(currentDashboard?.theme?.accentColor ?? '');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!currentDashboard) return null;

  const theme = currentDashboard.theme ?? {};
  const settings = currentDashboard.settings;

  const applyBg = (val: string) => {
    setBgInput(val);
    updateDashboardTheme(currentDashboard.id, { backgroundColor: val || undefined });
  };

  const applyAccent = (val: string) => {
    setAccentInput(val);
    updateDashboardTheme(currentDashboard.id, { accentColor: val || undefined });
  };

  return (
    <div ref={panelRef} className="dash-settings-panel">
      <div className="dash-settings-header">
        <Settings size={13} color="var(--accent)" />
        <span className="dash-settings-title">Dashboard Settings</span>
        <button onClick={onClose} className="config-panel-close">
          <X size={12} />
        </button>
      </div>

      <div className="dash-settings-body">
        {/* ── Theme ── */}
        <div className="dash-settings-section">
          <div className="dash-settings-section-label">
            <Palette size={12} />
            Theme
          </div>

          <label className="config-field">
            <span className="config-label">Background</span>
            <input
              type="text"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
              onBlur={() => applyBg(bgInput)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyBg(bgInput); }}
              placeholder="e.g. #0d0d0f"
              className="config-input"
            />
          </label>

          <label className="config-field">
            <span className="config-label">Accent</span>
            <div className="config-color-wrap">
              <input
                type="color"
                value={accentInput || '#7c6aff'}
                onChange={(e) => applyAccent(e.target.value)}
                className="config-color"
              />
              <span className="config-color-label">{accentInput || 'default'}</span>
            </div>
          </label>

          <div className="dash-accent-presets">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.value}
                title={p.label}
                onClick={() => applyAccent(p.value)}
                className="dash-accent-swatch"
                style={{
                  background: p.value,
                  boxShadow: accentInput === p.value ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${p.value}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="dash-settings-section">
          <div className="dash-settings-section-label">
            <Grid3X3 size={12} />
            Grid
          </div>

          <label className="config-field">
            <span className="config-label">Columns</span>
            <input
              type="number"
              min={4}
              max={24}
              value={settings.gridColumns ?? 12}
              onChange={(e) => updateDashboardSettings(currentDashboard.id, { gridColumns: Number(e.target.value) })}
              className="config-input"
            />
          </label>

          <label className="config-field">
            <span className="config-label">Row Height (px)</span>
            <input
              type="number"
              min={30}
              max={120}
              step={5}
              value={settings.gridRowHeight ?? 60}
              onChange={(e) => updateDashboardSettings(currentDashboard.id, { gridRowHeight: Number(e.target.value) })}
              className="config-input"
            />
          </label>
        </div>

        {/* ── Actions ── */}
        <div className="dash-settings-section">
          <button
            onClick={() => { duplicateDashboard(currentDashboard.id); onClose(); }}
            className="dash-duplicate-btn"
          >
            <Copy size={13} />
            Duplicate Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
