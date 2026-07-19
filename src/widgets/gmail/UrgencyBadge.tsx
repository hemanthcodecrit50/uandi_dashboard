import { URGENCY } from './types';
import type { Urgency } from '@/lib/gmailClient';

export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const { color, label } = URGENCY[urgency];
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
      color, background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: '4px', padding: '1px 5px', flexShrink: 0,
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}
