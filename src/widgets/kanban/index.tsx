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

interface DragPayload {
  cardId: string;
  colId: string;
}

interface DropTarget {
  colId: string;
  index: number;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', cards: [] },
  { id: 'doing', title: 'Doing', cards: [] },
  { id: 'done', title: 'Done', cards: [] },
];

let cardId = 0;
const genCardId = () => `card_${Date.now()}_${++cardId}`;

function readDragPayload(e: React.DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.cardId === 'string' && typeof parsed.colId === 'string') {
      return parsed;
    }
  } catch {
    // ignore malformed payload
  }
  return null;
}

function ColumnView({
  column,
  onUpdate,
  onMoveCard,
  draggingCardId,
  setDraggingCardId,
  dropTarget,
  setDropTarget,
}: {
  column: KanbanColumn;
  onUpdate: (col: KanbanColumn) => void;
  onMoveCard: (from: DragPayload, toColId: string, toIndex: number) => void;
  draggingCardId: string | null;
  setDraggingCardId: (id: string | null) => void;
  dropTarget: DropTarget | null;
  setDropTarget: (t: DropTarget | null) => void;
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

  const clearDrag = () => {
    setDraggingCardId(null);
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = readDragPayload(e);
    if (payload) onMoveCard(payload, column.id, index);
    clearDrag();
  };

  const cardsWithIndicators: React.ReactNode[] = [];
  column.cards.forEach((card, idx) => {
    if (draggingCardId && dropTarget?.colId === column.id && dropTarget.index === idx) {
      cardsWithIndicators.push(<div key={`indicator-${idx}`} className="kanban-drop-indicator" />);
    }
    cardsWithIndicators.push(
      <div
        key={card.id}
        className={`kanban-card${draggingCardId === card.id ? ' dragging' : ''}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ cardId: card.id, colId: column.id }));
          e.dataTransfer.effectAllowed = 'move';
          setDraggingCardId(card.id);
        }}
        onDragEnd={clearDrag}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          const rect = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height / 2;
          setDropTarget({ colId: column.id, index: before ? idx : idx + 1 });
        }}
        onDrop={(e) => handleDrop(e, dropTarget?.colId === column.id ? dropTarget.index : idx)}
      >
        <GripVertical size={10} color="var(--text-dim)" className="kanban-card-grip" />
        <span className="kanban-card-text">{card.text}</span>
        <button onClick={() => removeCard(card.id)} className="kanban-card-del">
          <Trash2 size={10} />
        </button>
      </div>,
    );
  });
  if (draggingCardId && dropTarget?.colId === column.id && dropTarget.index === column.cards.length) {
    cardsWithIndicators.push(<div key="indicator-end" className="kanban-drop-indicator" />);
  }

  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <span className="kanban-col-title">{column.title}</span>
        <span className="kanban-col-count">{column.cards.length}</span>
      </div>
      <div
        className="kanban-cards"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDropTarget({ colId: column.id, index: column.cards.length });
        }}
        onDrop={(e) => handleDrop(e, column.cards.length)}
      >
        {cardsWithIndicators}
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
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const columns = parseColumns(config.columns);

  const updateColumn = (idx: number, col: KanbanColumn) => {
    const next = [...columns];
    next[idx] = col;
    updateWidgetConfig(id, { columns: next });
  };

  const moveCard = (from: DragPayload, toColId: string, toIndex: number) => {
    const fromIdx = columns.findIndex((c) => c.id === from.colId);
    const toIdx = columns.findIndex((c) => c.id === toColId);
    if (fromIdx === -1 || toIdx === -1) return;

    const cardIdxInFrom = columns[fromIdx].cards.findIndex((c) => c.id === from.cardId);
    if (cardIdxInFrom === -1) return;

    const next = columns.map((col) => ({ ...col, cards: [...col.cards] }));
    const [card] = next[fromIdx].cards.splice(cardIdxInFrom, 1);

    let insertIndex = toIndex;
    if (fromIdx === toIdx && cardIdxInFrom < toIndex) {
      insertIndex -= 1;
    }
    insertIndex = Math.max(0, Math.min(insertIndex, next[toIdx].cards.length));
    next[toIdx].cards.splice(insertIndex, 0, card);

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
          <ColumnView
            key={col.id}
            column={col}
            onUpdate={(c) => updateColumn(i, c)}
            onMoveCard={moveCard}
            draggingCardId={draggingCardId}
            setDraggingCardId={setDraggingCardId}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
          />
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
