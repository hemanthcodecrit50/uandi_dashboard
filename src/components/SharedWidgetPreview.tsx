'use client';

import { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import type { WidgetInstance } from '@/types';
import { renderMarkdown } from '@/widgets/markdown/render';

interface KanbanCardLike { id: string; text: string }
interface KanbanColumnLike { id: string; title: string; cards: KanbanCardLike[] }

// Read-only previews for the widget types that actually make sense to share
// (note/markdown/kanban carry user content; the rest are personal API-bound
// widgets). Anything else falls back to a generic key/value dump so nothing
// silently renders blank.
function ReadOnlyPreview({ widget }: { widget: WidgetInstance }) {
  const config = widget.configuration;

  if (widget.widgetType === 'MarkdownWidget') {
    const content = (config.content as string) || '*Nothing here yet*';
    return <div className="md-preview shared-widget-preview-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />;
  }

  if (widget.widgetType === 'TextWidget') {
    return (
      <div className="shared-widget-preview-body">
        <h4 className="shared-widget-preview-title">{(config.title as string) || 'Note'}</h4>
        <p className="shared-widget-preview-text">{(config.content as string) || '—'}</p>
      </div>
    );
  }

  if (widget.widgetType === 'KanbanWidget') {
    const columns = Array.isArray(config.columns) ? (config.columns as KanbanColumnLike[]) : [];
    return (
      <div className="kanban-board shared-widget-preview-body">
        {columns.map((col) => (
          <div key={col.id} className="kanban-col">
            <div className="kanban-col-header">
              <span className="kanban-col-title">{col.title}</span>
              <span className="kanban-col-count">{col.cards.length}</span>
            </div>
            <div className="kanban-cards">
              {col.cards.map((card) => (
                <div key={card.id} className="kanban-card" style={{ cursor: 'default' }}>
                  <span className="kanban-card-text">{card.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(config);
  return (
    <div className="shared-widget-preview-body">
      {entries.length === 0 ? (
        <span className="friends-empty-note">No content</span>
      ) : (
        entries.map(([k, v]) => (
          <div key={k} className="shared-kv-row">
            <span className="shared-kv-key">{k}</span>
            <span className="shared-kv-val">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
          </div>
        ))
      )}
    </div>
  );
}

interface SharedWidgetPreviewProps {
  widget: WidgetInstance;
  editable: boolean;
  onSave: (instanceId: string, configuration: Record<string, unknown>) => Promise<void>;
}

// Collaborative editing is intentionally scoped to a raw JSON editor for the
// widget's `configuration` rather than mounting the full interactive widget
// component — those components write through the local Zustand store, which
// has no knowledge of a remote widget instance, so their own buttons would
// silently no-op here. This proves the end-to-end access-controlled write
// path (PATCH -> saveDashboardEdits -> poll refresh for other viewers)
// without risking that footgun. A richer per-widget-type collaborative
// editor is a natural next increment.
export default function SharedWidgetPreview({ widget, editable, onSave }: SharedWidgetPreviewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(JSON.stringify(widget.configuration, null, 2));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setError('Invalid JSON');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(widget.instanceId, parsed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="widget-card shared-widget-card">
      <div className="shared-widget-header">
        <span className="shared-widget-type">{widget.widgetType.replace('Widget', '')}</span>
        {editable && !editing && (
          <button className="shared-widget-edit-btn" onClick={startEdit} title="Edit (collaborative)">
            <Pencil size={12} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="shared-widget-editor">
          <textarea
            className="shared-widget-editor-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
          {error && <span className="shared-widget-editor-error">{error}</span>}
          <div className="shared-widget-editor-actions">
            <button className="friend-action-btn" onClick={() => setEditing(false)}>Cancel</button>
            <button className="friend-action-btn friend-action-btn--accent" disabled={saving} onClick={save}>
              <Check size={11} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <ReadOnlyPreview widget={widget} />
      )}
    </div>
  );
}
