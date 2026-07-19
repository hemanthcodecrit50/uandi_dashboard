import { FILTERS } from './types';
import type { FilterKey } from './types';

export default function FilterTabs({ active, onChange }: { active: FilterKey; onChange: (f: FilterKey) => void }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, overflowX: 'auto' }}>
      {FILTERS.map(f => (
        <button key={f.key} onClick={() => onChange(f.key)} style={{
          background: active === f.key ? (f.color ? `${f.color}20` : 'var(--accent-dim)') : 'none',
          border: `1px solid ${active === f.key ? (f.color ?? 'var(--accent)') + '60' : 'var(--border)'}`,
          borderRadius: '6px',
          color: active === f.key ? (f.color ?? 'var(--accent)') : 'var(--text-muted)',
          cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500,
          padding: '3px 8px', whiteSpace: 'nowrap', transition: 'all 100ms ease',
        }}>
          {f.label}
        </button>
      ))}
    </div>
  );
}
