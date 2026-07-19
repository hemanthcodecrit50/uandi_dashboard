import { Mail, MailOpen } from 'lucide-react';
import { URGENCY } from './types';
import UrgencyBadge from './UrgencyBadge';
import type { EmailMessage } from '@/lib/gmailClient';

export default function EmailRow({ email, active, onClick }: { email: EmailMessage; active: boolean; onClick: () => void }) {
  const { color } = URGENCY[email.urgency];
  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(email.date));

  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--surface-2)' : 'none',
        border: 'none', borderRadius: '8px', cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '8px 10px', textAlign: 'left', width: '100%',
        transition: 'background 100ms ease',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingTop: '3px', flexShrink: 0 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: color, display: 'block',
          boxShadow: email.urgency !== 'low' ? `0 0 6px ${color}80` : 'none',
        }} />
        {email.isRead
          ? <MailOpen size={11} color="var(--text-dim)" />
          : <Mail size={11} color="var(--accent)" />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: email.isRead ? 400 : 600,
            color: email.isRead ? 'var(--text-muted)' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {email.fromName || email.from}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {dateStr}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: email.isRead ? 400 : 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {email.subject}
          </span>
          <UrgencyBadge urgency={email.urgency} />
        </div>
        {email.snippet && (
          <span style={{
            fontSize: '0.72rem', color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
          }}>
            {email.snippet}
          </span>
        )}
      </div>
    </button>
  );
}
