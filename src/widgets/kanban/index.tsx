'use client';

import { useState } from 'react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { useDashboardStore } from '@/store';
import { Plus, Trash2, GripVertical, LayoutGrid } from 'lucide-react';

interface KanbanCard {
  id: string;
  text: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', cards: [] },
  { id: 'doing', title: 'Doing', cards: [] },
  { id: 'done', title: 'Done', cards: [] },
];

let cardId = 0;
const genCardId = () => `card_${Date.now()}_${++cardId}`;

function ColumnView({
  column,
  onUpdate,
}: {
  column: KanbanColumn;
  onUpdate: (col: KanbanColumn) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');

  const addCard = () => {
    const t = newText.trim();
    if (!t) return;
    onUpdate({ ...column, cards: [...column.cards, { id: genCardId(), text: t }] });
    setNewText('');
    setAdding(false);
  };

  const removeCard = (cardId: string) => {
    onUpdate({ ...column, cards: column.cards.filter((c) => c.id !== cardId) });
  };

  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <span className="kanban-col-title">{column.title}</span>
        <span className="kanban-col-count">{column.cards.length}</span>
      </div>
      <div className="kanban-cards">
        {column.cards.map((card) => (
          <div key={card.id} className="kanban-card">
            <GripVertical size={10} color="var(--text-dim)" className="kanban-card-grip" />
            <span className="kanban-card-text">{card.text}</span>
            <button onClick={() => removeCard(card.id)} className="kanban-card-del">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {adding ? (
          <div className="kanban-add-form">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCard(); if (e.key === 'Escape') { setAdding(false); setNewText(''); } }}
              onBlur={() => { if (newText.trim()) addCard(); else setAdding(false); }}
              placeholder="Card title…"
              className="kanban-add-input"
              autoFocus
            />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="kanban-add-btn">
            <Plus size={11} /> Add card
          </button>
        )}
      </div>
    </div>
  );
}

function parseColumns(raw: unknown): KanbanColumn[] {
  if (!raw) return DEFAULT_COLUMNS;
  let val = raw;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch { return DEFAULT_COLUMNS; }
  }
  if (!Array.isArray(val)) return DEFAULT_COLUMNS;
  return val.filter(
    (col): col is KanbanColumn =>
      col != null &&
      typeof col === 'object' &&
      typeof (col as KanbanColumn).id === 'string' &&
      typeof (col as KanbanColumn).title === 'string' &&
      Array.isArray((col as KanbanColumn).cards),
  );
}

export default function KanbanWidget({ id, config }: WidgetProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);

  const columns = parseColumns(config.columns);

  const updateColumn = (idx: number, col: KanbanColumn) => {
    const next = [...columns];
    next[idx] = col;
    updateWidgetConfig(id, { columns: next });
  };

  return (
    <div className="widget-card" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <LayoutGrid size={14} color="var(--accent)" />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
          Kanban
        </span>
      </div>
      <div className="kanban-board">
        {columns.map((col, i) => (
          <ColumnView key={col.id} column={col} onUpdate={(c) => updateColumn(i, c)} />
        ))}
      </div>
    </div>
  );
}

export const metadata = {
  id: 'KanbanWidget',
  displayName: 'Kanban',
  description: 'Simple 3-column board',
  icon: 'LayoutGrid',
  defaultSize: { w: 6, h: 4 } as { w: number; h: number },
  minSize: { w: 4, h: 3 } as { w: number; h: number },
  capabilities: ['shareable', 'configurable'] as WidgetCapability[],
  tags: ['productivity', 'planning'],
  configurationSchema: {
    fields: [
      {
        key: 'columns',
        label: 'Board Data',
        type: 'text' as const,
        defaultValue: undefined,
      },
    ],
  } as ConfigurationSchema,
};
