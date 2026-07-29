'use client';

import { useRef, useState } from 'react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { useDashboardStore } from '@/store';
import { Pencil, Check, Eye, Upload } from 'lucide-react';
import { renderMarkdown } from './render';

export default function MarkdownWidget({ id, config }: WidgetProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const [editing, setEditing] = useState(false);
  const [buffer, setBuffer] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const content = (config.content as string) || '*Nothing here yet*';

  const startEdit = () => { setBuffer(content); setEditing(true); };
  const save = () => { updateWidgetConfig(id, { content: buffer }); setEditing(false); };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result !== 'string') return;
      const text = ev.target.result;
      if (editing) {
        setBuffer(text);
      } else {
        updateWidgetConfig(id, { content: text });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="widget-card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
          Markdown
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="md-edit-btn"
            title="Import a .md file"
          >
            <Upload size={12} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={editing ? save : startEdit}
            className="md-edit-btn"
          >
            {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={buffer}
          onChange={(e) => setBuffer(e.target.value)}
          className="md-editor"
          autoFocus
        />
      ) : (
        <div
          className="md-preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
}

export const metadata = {
  id: 'MarkdownWidget',
  displayName: 'Markdown',
  description: 'Write notes in Markdown',
  icon: 'FileCode',
  defaultSize: { w: 4, h: 4 } as { w: number; h: number },
  minSize: { w: 3, h: 3 } as { w: number; h: number },
  capabilities: ['shareable', 'exportable', 'configurable'] as WidgetCapability[],
  tags: ['productivity', 'text'],
  configurationSchema: {
    fields: [
      {
        key: 'content',
        label: 'Content',
        type: 'text' as const,
        defaultValue: '',
      },
    ],
  } as ConfigurationSchema,
};
