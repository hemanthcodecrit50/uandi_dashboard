'use client';

import { useRef, useState } from 'react';
import { useDashboardStore } from '@/store';
import { widgetRegistry } from '@/registry';
import { LayoutDashboard, Plus, Download, Upload, Check, Pencil, ChevronDown } from 'lucide-react';

export default function Toolbar() {
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const setEditMode = useDashboardStore((s) => s.setEditMode);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const exportLayout = useDashboardStore((s) => s.exportLayout);
  const importLayout = useDashboardStore((s) => s.importLayout);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allWidgets = widgetRegistry.getAll();

  const handleExport = () => {
    const blob = new Blob([exportLayout()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') importLayout(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="toolbar">
      <div className="toolbar-logo">
        <LayoutDashboard size={18} color="var(--accent)" />
        <span className="toolbar-wordmark">dash</span>
      </div>

      <div className="toolbar-divider" />

      <button
        onClick={() => setEditMode(!isEditMode)}
        className={`toolbar-btn ${isEditMode ? 'toolbar-btn--active' : ''}`}
      >
        {isEditMode ? <Check size={14} /> : <Pencil size={14} />}
        {isEditMode ? 'Done' : 'Edit'}
      </button>

      {isEditMode && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="toolbar-btn toolbar-btn--accent"
          >
            <Plus size={14} />
            Add Widget
            <ChevronDown
              size={12}
              style={{
                transform: showAddMenu ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
          </button>

          {showAddMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setShowAddMenu(false)}
              />
              <div className="add-menu">
                {allWidgets.map((def) => (
                  <button
                    key={def.id}
                    // Toolbar no longer passes sizes — store resolves the definition.
                    onClick={() => { addWidget(def.id); setShowAddMenu(false); }}
                    className="add-menu-item"
                  >
                    <span className="add-menu-item__name">{def.displayName}</span>
                    <span className="add-menu-item__desc">{def.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <button onClick={handleExport} title="Export layout" className="toolbar-icon-btn">
        <Download size={15} />
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Import layout"
        className="toolbar-icon-btn"
      >
        <Upload size={15} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
    </header>
  );
}
