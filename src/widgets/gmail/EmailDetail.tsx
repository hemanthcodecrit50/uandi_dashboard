import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { URGENCY } from './types';
import UrgencyBadge from './UrgencyBadge';
import { apiFetch } from './api';
import type { EmailMessage } from '@/lib/gmailClient';

interface EmailBodyResponse {
  body: string;
}

export default function EmailDetail({ email, onClose }: { email: EmailMessage; onClose: () => void }) {
  const { color } = URGENCY[email.urgency];
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(email.date));

  const { data: bodyData, isLoading: bodyLoading, error: bodyError } = useQuery({
    queryKey: ['gmail-body', email.id],
    queryFn: () => apiFetch<EmailBodyResponse>(`/api/gmail/messages/${email.id}`),
    staleTime: 600_000,
    retry: false,
  });

  const bodyHtml = bodyData?.body;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <UrgencyBadge urgency={email.urgency} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dateStr}</span>
          </div>
          <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            {email.subject}
          </h4>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            From: <span style={{ color }}>{email.fromName ? `${email.fromName} <${email.from}>` : email.from}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: '0.72rem', padding: '4px 8px', flexShrink: 0,
          }}
        >
          ← Back
        </button>
      </div>
      <div style={{
        flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '14px', fontSize: '0.82rem',
        color: 'var(--text-muted)', lineHeight: 1.7, overflowY: 'auto',
      }}>
        {bodyLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <RefreshCw size={16} color="var(--text-dim)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : bodyError ? (
          <div>
            <p style={{ margin: 0 }}>{email.snippet}</p>
            <p style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Could not load full body — showing snippet only.
            </p>
          </div>
        ) : bodyHtml ? (
          <div
            className="gmail-body"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p style={{ margin: 0 }}>{email.snippet}</p>
        )}
      </div>
    </div>
  );
}
