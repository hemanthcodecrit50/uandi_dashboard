'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MailOpen, RefreshCw, AlertTriangle, Clock, Info, LogOut, Chrome } from 'lucide-react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import type { EmailMessage, EmailsResponse, Urgency } from '@/lib/gmailClient';
import type { MeResponse } from '@/app/api/auth/me/route';

// ─── Urgency config ────────────────────────────────────────────────────────────

const URGENCY: Record<Urgency, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  critical: { label: 'Critical', color: '#ff5f57', Icon: AlertTriangle },
  high:     { label: 'High',     color: '#f5a623', Icon: AlertTriangle },
  medium:   { label: 'Medium',   color: '#7c6aff', Icon: Clock },
  low:      { label: 'Low',      color: '#6b6b75', Icon: Info },
};

// ─── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'API error'), { status: res.status, data });
  return data as T;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
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

function EmailRow({ email, active, onClick }: { email: EmailMessage; active: boolean; onClick: () => void }) {
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
      {/* Urgency dot + read/unread icon */}
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

      {/* Content */}
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

function EmailDetail({ email, onClose }: { email: EmailMessage; onClose: () => void }) {
  const { color } = URGENCY[email.urgency];
  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(email.date));

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
        <p style={{ margin: 0 }}>{email.snippet}</p>
        <p style={{ marginTop: '16px', fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Full email body loading coming soon — open in Gmail to read more.
        </p>
      </div>
    </div>
  );
}

// ─── Connect screen (not authenticated) ───────────────────────────────────────

function ConnectScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', padding: '24px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '12px', background: 'var(--accent-dim)',
        border: '1px solid rgba(124,106,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Mail size={22} color="var(--accent)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
          Connect Gmail
        </h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Sign in with Google to display your inbox with urgency-based colour coding.
        </p>
      </div>
      <a
        href="/api/auth/google"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--accent)', border: 'none', borderRadius: '8px',
          color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif", padding: '9px 18px',
          textDecoration: 'none', transition: 'opacity 150ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <Chrome size={15} />
        Sign in with Google
      </a>
      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'center', margin: 0 }}>
        Read-only access · tokens stored securely server-side
      </p>
    </div>
  );
}

// ─── Error screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuthError = message.includes('auth');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', padding: '24px' }}>
      <AlertTriangle size={28} color="var(--red)" />
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>{message}</p>
      {isAuthError ? (
        <a href="/api/auth/google" style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px',
          color: 'var(--text)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
          padding: '6px 14px', textDecoration: 'none',
        }}>
          Reconnect Gmail
        </a>
      ) : (
        <button onClick={onRetry} style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px',
          color: 'var(--text)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, padding: '6px 14px',
        }}>
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Main widget ───────────────────────────────────────────────────────────────

type FilterKey = Urgency | 'all';

const FILTERS: { key: FilterKey; label: string; color?: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical', color: '#ff5f57' },
  { key: 'high',     label: 'High',     color: '#f5a623' },
  { key: 'medium',   label: 'Medium',   color: '#7c6aff' },
  { key: 'low',      label: 'Low',      color: '#6b6b75' },
];

export default function GmailWidget({ config }: WidgetProps) {
  const title = (config.title as string) || 'Gmail';
  const qc = useQueryClient();

  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [allMessages, setAllMessages] = useState<EmailMessage[]>([]);
  const [spinning, setSpinning] = useState(false);

  // ── Auth state ──
  const { data: meData, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['gmail-user'],
    queryFn: () => apiFetch<MeResponse>('/api/auth/me'),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const user = meData?.user ?? null;

  // ── Email fetch ──
  const {
    data: emailData,
    isLoading: emailLoading,
    error: emailError,
    refetch,
  } = useQuery({
    queryKey: ['gmail-messages', pageToken] as const,
    queryFn: async (): Promise<EmailsResponse> => {
      const data = await apiFetch<EmailsResponse>(`/api/gmail/messages${pageToken ? `?pageToken=${pageToken}` : ''}`);
      // Accumulate pages client-side
      setAllMessages(prev => pageToken ? [...prev, ...data.messages] : data.messages);
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: (count: number, err: unknown) => {
      const e = err as { status?: number };
      if (e?.status === 401 || e?.status === 429) return false;
      return count < 2;
    },
  });

  // ── Logout ──
  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(['gmail-user'], { user: null });
      qc.removeQueries({ queryKey: ['gmail-messages'] });
      setAllMessages([]);
      setSelected(null);
    },
  });

  // ── Force refresh ──
  const handleRefresh = useCallback(() => {
    setSpinning(true);
    setPageToken(undefined);
    setAllMessages([]);
    qc.invalidateQueries({ queryKey: ['gmail-messages'] });
    refetch().finally(() => setTimeout(() => setSpinning(false), 600));
  }, [refetch, qc]);

  // ── Load more ──
  const handleLoadMore = () => {
    if (emailData?.nextPageToken) setPageToken(emailData.nextPageToken);
  };

  const isLoading = meLoading || (!!user && emailLoading && allMessages.length === 0);

  const filtered: EmailMessage[] = filter === 'all'
    ? allMessages
    : allMessages.filter(m => m.urgency === filter);

  const unreadCount = allMessages.filter(m => !m.isRead).length;
  const criticalUnread = allMessages.filter(m => m.urgency === 'critical' && !m.isRead).length;
  const selectedId = selected?.id ?? null;

  // ── Error message ──
  let errorMessage: string | null = null;
  if (emailError) {
    const e = emailError as { status?: number; data?: { error?: string } };
    if (e?.status === 401) errorMessage = 'Gmail access expired — please reconnect.';
    else if (e?.status === 429) errorMessage = 'Too many requests — try again in a minute.';
    else errorMessage = 'Could not load emails. Check your connection and try again.';
  }

  return (
    <div className="widget-card" style={{ padding: '16px', gap: '10px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Mail size={15} color="var(--accent)" />
        <h3 style={{
          fontFamily: "'Syne', sans-serif", fontSize: '0.88rem', fontWeight: 600,
          color: 'var(--text)', margin: 0, flex: 1, letterSpacing: '-0.01em',
        }}>
          {title}
          {user && (
            <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
              {user.email}
            </span>
          )}
        </h3>

        {user && unreadCount > 0 && (
          <span style={{
            background: criticalUnread > 0 ? '#ff5f5720' : 'var(--accent-dim)',
            border: `1px solid ${criticalUnread > 0 ? '#ff5f5750' : 'rgba(124,106,255,0.3)'}`,
            borderRadius: '10px',
            color: criticalUnread > 0 ? '#ff5f57' : 'var(--accent)',
            fontSize: '0.62rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            padding: '1px 7px',
          }}>
            {unreadCount} unread{criticalUnread > 0 ? ` · ${criticalUnread} critical` : ''}
          </span>
        )}

        {user && (
          <>
            <button onClick={handleRefresh} title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            >
              <RefreshCw size={13} style={{ animation: spinning ? 'spin 0.8s linear' : 'none' }} />
            </button>
            <button onClick={() => logoutMutation.mutate()} title="Disconnect Gmail"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--red)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            >
              <LogOut size={13} />
            </button>
          </>
        )}
      </div>

      {/* ── States ── */}
      {meLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading…</span>
        </div>
      )}

      {!meLoading && !user && <ConnectScreen />}

      {!meLoading && user && isLoading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: 56, borderRadius: '8px', background: 'var(--surface-2)',
              opacity: 1 - i * 0.12,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {!meLoading && user && !isLoading && errorMessage && !selected && (
        <ErrorScreen message={errorMessage} onRetry={handleRefresh} />
      )}

      {!meLoading && user && !isLoading && !errorMessage && (
        selected ? (
          <EmailDetail email={selected} onClose={() => setSelected(null)} />
        ) : (
          <>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, overflowX: 'auto' }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  background: filter === f.key ? (f.color ? `${f.color}20` : 'var(--accent-dim)') : 'none',
                  border: `1px solid ${filter === f.key ? (f.color ?? 'var(--accent)') + '60' : 'var(--border)'}`,
                  borderRadius: '6px',
                  color: filter === f.key ? (f.color ?? 'var(--accent)') : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500,
                  padding: '3px 8px', whiteSpace: 'nowrap', transition: 'all 100ms ease',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Email list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filtered.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>
                  {allMessages.length === 0 ? 'Your inbox is empty.' : 'No emails in this category.'}
                </p>
              ) : filtered.map(email => {
                const isActive = selectedId === email.id;
                return (
                  <EmailRow
                    key={email.id}
                    email={email}
                    active={isActive}
                    onClick={() => setSelected(email)}
                  />
                );
              })}

              {/* Load more */}
              {emailData?.nextPageToken && (
                <button
                  onClick={handleLoadMore}
                  disabled={emailLoading}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem',
                    padding: '6px', margin: '4px 10px', transition: 'all 100ms ease',
                    opacity: emailLoading ? 0.5 : 1,
                  }}
                >
                  {emailLoading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>

            {/* Footer: cache indicator */}
            {emailData?.fromCache && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Cached · hit refresh to update
                </span>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

// ─── Definition ────────────────────────────────────────────────────────────────

export const metadata = {
  id: 'GmailWidget',
  displayName: 'Gmail',
  description: 'Inbox emails colour-coded by urgency',
  icon: 'Mail',
  defaultSize: { w: 5, h: 6 } as { w: number; h: number },
  minSize: { w: 4, h: 4 } as { w: number; h: number },
  capabilities: ['shareable', 'realtime', 'configurable'] as WidgetCapability[],
  tags: ['productivity', 'email'],
  configurationSchema: {
    fields: [
      {
        key: 'title',
        label: 'Title',
        type: 'text' as const,
        defaultValue: 'Gmail',
      },
    ],
  } as ConfigurationSchema,
};
