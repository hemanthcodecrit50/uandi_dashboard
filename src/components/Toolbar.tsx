'use client';

import { useRef, useState } from 'react';
import { useDashboardStore } from '@/store';
import { widgetRegistry } from '@/registry';
import DashboardSettingsPanel from './DashboardSettingsPanel';
import {
  LayoutDashboard, Plus, Download, Upload, Check, Pencil, ChevronDown,
  Trash2, Pencil as PencilIcon, Settings,
} from 'lucide-react';

export default function Toolbar() {
  const isEditMode = useDashboardStore((s) => s.isEditMode);
  const setEditMode = useDashboardStore((s) => s.setEditMode);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const exportLayout = useDashboardStore((s) => s.exportLayout);
  const importLayout = useDashboardStore((s) => s.importLayout);

  const dashboards = useDashboardStore((s) => s.dashboards);
  const currentDashboardId = useDashboardStore((s) => s.currentDashboardId);
  const currentDashboard = useDashboardStore((s) => s.currentDashboard());
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const deleteDashboard = useDashboardStore((s) => s.deleteDashboard);
  const switchDashboard = useDashboardStore((s) => s.switchDashboard);
  const renameDashboard = useDashboardStore((s) => s.renameDashboard);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showDashSettings, setShowDashSettings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createDashboard(trimmed);
    setNewName('');
    setCreating(false);
    setShowDashboardMenu(false);
  };

  const handleRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameDashboard(id, trimmed);
    setRenamingId(null);
    setRenameValue('');
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-logo">
        <LayoutDashboard size={18} color="var(--accent)" />
        <span className="toolbar-wordmark">dash</span>
      </div>

      <div className="toolbar-divider" />

      {/* ── Dashboard Switcher ── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowDashboardMenu(!showDashboardMenu); setShowAddMenu(false); }}
          className="toolbar-btn"
        >
          <LayoutDashboard size={13} />
          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentDashboard?.name ?? 'Dashboard'}
          </span>
          <ChevronDown
            size={12}
            style={{
              transform: showDashboardMenu ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        </button>

        {showDashboardMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => { setShowDashboardMenu(false); setCreating(false); setRenamingId(null); }}
            />
            <div className="dashboard-menu">
              {dashboards.map((d) => (
                <div key={d.id} className="dashboard-menu-item">
                  {renamingId === d.id ? (
                    <div className="dashboard-menu-rename">
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(d.id);
                          if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                        }}
                        onBlur={() => handleRename(d.id)}
                        className="dashboard-rename-input"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => { switchDashboard(d.id); setShowDashboardMenu(false); }}
                      className={`dashboard-menu-btn ${d.id === currentDashboardId ? 'dashboard-menu-btn--active' : ''}`}
                    >
                      <span>{d.name}</span>
                      {d.isDefault && <span className="dashboard-badge">Default</span>}
                    </button>
                  )}

                  {!d.isDefault && renamingId !== d.id && (
                    <div className="dashboard-menu-actions">
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(d.id, d.name); }}
                        title="Rename"
                        className="dashboard-action-btn"
                      >
                        <PencilIcon size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteDashboard(d.id); }}
                        title="Delete"
                        className="dashboard-action-btn dashboard-action-btn--danger"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {creating ? (
                <div className="dashboard-menu-create">
                  <input
                    ref={createInputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                    }}
                    onBlur={() => { if (newName.trim()) handleCreate(); else setCreating(false); }}
                    placeholder="Dashboard name…"
                    className="dashboard-create-input"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setCreating(true); setTimeout(() => createInputRef.current?.focus(), 0); }}
                  className="dashboard-menu-add"
                >
                  <Plus size={13} />
                  New Dashboard
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* ── Dashboard Settings ── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowDashSettings(!showDashSettings); setShowAddMenu(false); setShowDashboardMenu(false); }}
          title="Dashboard settings"
          className={`toolbar-icon-btn ${showDashSettings ? 'toolbar-btn--active' : ''}`}
          style={showDashSettings ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : undefined}
        >
          <Settings size={15} />
        </button>
        {showDashSettings && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setShowDashSettings(false)}
            />
            <DashboardSettingsPanel onClose={() => setShowDashSettings(false)} />
          </>
        )}
      </div>

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
