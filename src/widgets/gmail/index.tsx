'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import type { EmailMessage, EmailsResponse } from '@/lib/gmailClient';
import type { MeResponse } from '@/app/api/auth/me/route';
import { apiFetch } from './api';
import type { FilterKey } from './types';
import ConnectScreen from './ConnectScreen';
import ErrorScreen from './ErrorScreen';
import FilterTabs from './FilterTabs';
import EmailRow from './EmailRow';
import EmailDetail from './EmailDetail';

export default function GmailWidget({ config }: WidgetProps) {
  const title = (config.title as string) || 'Gmail';
  const qc = useQueryClient();

  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [allMessages, setAllMessages] = useState<EmailMessage[]>([]);
  const [spinning, setSpinning] = useState(false);

  const { data: meData, isLoading: meLoading } = useQuery<MeResponse>({
    queryKey: ['gmail-user'],
    queryFn: () => apiFetch<MeResponse>('/api/auth/me'),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const user = meData?.user ?? null;

  const {
    data: emailData,
    isLoading: emailLoading,
    error: emailError,
    refetch,
  } = useQuery({
    queryKey: ['gmail-messages', pageToken] as const,
    queryFn: async (): Promise<EmailsResponse> => {
      const data = await apiFetch<EmailsResponse>(`/api/gmail/messages${pageToken ? `?pageToken=${pageToken}` : ''}`);
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

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(['gmail-user'], { user: null });
      qc.removeQueries({ queryKey: ['gmail-messages'] });
      setAllMessages([]);
      setSelected(null);
    },
  });

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    setPageToken(undefined);
    setAllMessages([]);
    qc.invalidateQueries({ queryKey: ['gmail-messages'] });
    refetch().finally(() => setTimeout(() => setSpinning(false), 600));
  }, [refetch, qc]);

  const handleLoadMore = () => {
    if (emailData?.nextPageToken) setPageToken(emailData.nextPageToken);
  };

  const isLoading = meLoading || (!!user && emailLoading && allMessages.length === 0);

  const filtered: EmailMessage[] = filter === 'all'
    ? allMessages
    : allMessages.filter(m => m.urgency === filter);

  const unreadCount = allMessages.filter(m => !m.isRead).length;
  const criticalUnread = allMessages.filter(m => m.urgency === 'critical' && !m.isRead).length;

  let errorMessage: string | null = null;
  if (emailError) {
    const e = emailError as { status?: number; data?: { error?: string } };
    if (e?.status === 401) errorMessage = 'Gmail access expired — please reconnect.';
    else if (e?.status === 429) errorMessage = 'Too many requests — try again in a minute.';
    else errorMessage = 'Could not load emails. Check your connection and try again.';
  }

  return (
    <div className="widget-card" style={{ padding: '16px', gap: '10px' }}>
      {/* Header */}
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

      {/* States */}
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
            <FilterTabs active={filter} onChange={setFilter} />

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filtered.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>
                  {allMessages.length === 0 ? 'Your inbox is empty.' : 'No emails in this category.'}
                </p>
              ) : filtered.map(email => (
                <EmailRow
                  key={email.id}
                  email={email}
                  active={false}
                  onClick={() => setSelected(email)}
                />
              ))}

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
