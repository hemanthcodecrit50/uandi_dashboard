'use client';

import { useState } from 'react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { useDashboardStore } from '@/store';
import { Pencil, Check } from 'lucide-react';

export default function TextWidget({ id, config }: WidgetProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);

  // Edit buffer — only populated while the user is actively editing.
  const [editing, setEditing] = useState<{ title: string; content: string } | null>(null);

  // Derive display values from config (the single source of truth).
  // This eliminates stale-state bugs when config is updated externally (e.g. import).
  const savedTitle = (config.title as string) || 'Note';
  const savedContent = (config.content as string) || '';

  const startEditing = () => setEditing({ title: savedTitle, content: savedContent });

  const save = () => {
    if (!editing) return;
    updateWidgetConfig(id, { title: editing.title, content: editing.content });
    setEditing(null);
  };

  const cancel = () => setEditing(null);

  const isEditing = editing !== null;

  return (
    <div className="widget-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        {isEditing ? (
          <input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            autoFocus
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--accent)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              padding: '4px 8px',
              outline: 'none',
              width: '100%',
              marginRight: '8px',
            }}
          />
        ) : (
          <h3 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>
            {savedTitle}
          </h3>
        )}
        <button
          onClick={isEditing ? save : startEditing}
          style={{
            background: isEditing ? 'var(--accent)' : 'var(--surface-2)',
            border: '1px solid ' + (isEditing ? 'var(--accent)' : 'var(--border)'),
            borderRadius: '6px',
            color: isEditing ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'all 150ms ease',
          }}
        >
          {isEditing ? <Check size={14} /> : <Pencil size={14} />}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={editing.content}
          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          rows={6}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            fontSize: '0.85rem',
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.6,
            padding: '10px',
            outline: 'none',
            resize: 'none',
            flex: 1,
            width: '100%',
            minHeight: '80px',
          }}
        />
      ) : (
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          lineHeight: 1.7,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowY: 'auto',
          flex: 1,
        }}>
          {savedContent || (
            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Click the edit icon to add a note…
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export const metadata = {
  id: 'TextWidget',
  displayName: 'Note',
  description: 'Editable text note',
  icon: 'FileText',
  defaultSize: { w: 4, h: 3 } as { w: number; h: number },
  minSize: { w: 2, h: 2 } as { w: number; h: number },
  capabilities: ['shareable', 'exportable', 'configurable'] as WidgetCapability[],
  tags: ['productivity', 'text'],
  configurationSchema: {
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text' as const,
        defaultValue: 'Note',
      },
      {
        key: 'content',
        label: 'Content',
        type: 'text' as const,
        defaultValue: '',
      },
    ],
  } as ConfigurationSchema,
};
