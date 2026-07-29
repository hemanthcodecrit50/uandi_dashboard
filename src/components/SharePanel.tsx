'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Share2, X, Globe, Copy, Trash2, UploadCloud, ExternalLink } from 'lucide-react';
import { apiFetch, apiPost, apiDelete } from '@/lib/apiClient';
import { useDashboardStore } from '@/store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { MyDashboardsResponse } from '@/app/api/dashboards/mine/route';
import type { SharedWithMeResponse } from '@/app/api/dashboards/shared-with-me/route';
import type { SharesResponse } from '@/app/api/dashboards/[id]/share/route';
import type { FriendsResponse } from '@/app/api/friends/route';

interface SharePanelProps {
  onClose: () => void;
}

export default function SharePanel({ onClose }: SharePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const currentDashboard = useDashboardStore((s) => s.currentDashboard());
  const currentWidgets = useDashboardStore((s) => s.currentWidgets());

  const [friendEmail, setFriendEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const { data: mineData } = useQuery<MyDashboardsResponse>({
    queryKey: ['my-server-dashboards'],
    queryFn: () => apiFetch<MyDashboardsResponse>('/api/dashboards/mine'),
    enabled: !!user,
  });

  const { data: sharedWithMeData } = useQuery<SharedWithMeResponse>({
    queryKey: ['shared-with-me'],
    queryFn: () => apiFetch<SharedWithMeResponse>('/api/dashboards/shared-with-me'),
    enabled: !!user,
  });

  const { data: friendsData } = useQuery<FriendsResponse>({
    queryKey: ['friends'],
    queryFn: () => apiFetch<FriendsResponse>('/api/friends'),
    enabled: !!user,
  });

  const isPublished = !!currentDashboard && (mineData?.dashboards.some((d) => d.id === currentDashboard.id) ?? false);

  const { data: sharesData } = useQuery<SharesResponse>({
    queryKey: ['shares', currentDashboard?.id],
    queryFn: () => apiFetch<SharesResponse>(`/api/dashboards/${currentDashboard!.id}/share`),
    enabled: !!user && isPublished,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['my-server-dashboards'] });
    queryClient.invalidateQueries({ queryKey: ['shares', currentDashboard?.id] });
  };

  const publishMutation = useMutation({
    mutationFn: () => apiPost('/api/dashboards/publish', { dashboard: currentDashboard, widgets: currentWidgets }),
    onSuccess: () => { setFeedback('Published'); invalidateAll(); },
    onError: (err: Error) => setFeedback(err.message),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => apiDelete(`/api/dashboards/${currentDashboard!.id}`),
    onSuccess: () => { setFeedback('Unpublished'); invalidateAll(); },
    onError: (err: Error) => setFeedback(err.message),
  });

  const shareMutation = useMutation({
    mutationFn: (opts: { sharedWithEmail?: string; isPublic?: boolean; permission: 'view' | 'edit' }) =>
      apiPost(`/api/dashboards/${currentDashboard!.id}/share`, opts),
    onSuccess: () => { setFriendEmail(''); setFeedback(null); invalidateAll(); },
    onError: (err: Error) => setFeedback(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => apiDelete(`/api/dashboards/${currentDashboard!.id}/share/${shareId}`),
    onSuccess: invalidateAll,
  });

  if (!user) {
    return (
      <div ref={panelRef} className="dash-settings-panel">
        <div className="dash-settings-header">
          <Share2 size={13} color="var(--accent)" />
          <span className="dash-settings-title">Share</span>
          <button onClick={onClose} className="config-panel-close"><X size={12} /></button>
        </div>
        <div className="dash-settings-body">
          <p className="friends-empty-note">Connect your Google account (Gmail widget) to publish and share dashboards.</p>
        </div>
      </div>
    );
  }

  const friends = friendsData?.friends ?? [];
  const sharedWithMe = sharedWithMeData?.shared ?? [];

  return (
    <div ref={panelRef} className="dash-settings-panel" style={{ width: 300 }}>
      <div className="dash-settings-header">
        <Share2 size={13} color="var(--accent)" />
        <span className="dash-settings-title">Share “{currentDashboard?.name}”</span>
        <button onClick={onClose} className="config-panel-close"><X size={12} /></button>
      </div>

      <div className="dash-settings-body">
        {/* ── Publish ── */}
        <div className="dash-settings-section">
          {!isPublished ? (
            <button className="dash-duplicate-btn" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
              <UploadCloud size={13} /> Publish this dashboard
            </button>
          ) : (
            <>
              <span className="friends-feedback">Published — friends can be invited below.</span>
              <button className="dash-duplicate-btn" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
                <UploadCloud size={13} /> Push latest changes
              </button>
              <button className="dash-duplicate-btn" disabled={unpublishMutation.isPending} onClick={() => unpublishMutation.mutate()}>
                <Trash2 size={13} /> Unpublish
              </button>
            </>
          )}
          {feedback && <span className="friends-feedback">{feedback}</span>}
        </div>

        {isPublished && (
          <>
            {/* ── Share with a friend ── */}
            <div className="dash-settings-section">
              <div className="dash-settings-section-label">Invite a friend</div>
              <select className="config-input" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)}>
                <option value="">Select a friend…</option>
                {friends.map(({ user: f }) => (
                  <option key={f.id} value={f.email}>{f.name}</option>
                ))}
              </select>
              <select className="config-input" value={permission} onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}>
                <option value="view">Can view</option>
                <option value="edit">Can edit (collaborative widgets)</option>
              </select>
              <button
                className="friend-action-btn friend-action-btn--accent"
                style={{ width: '100%' }}
                disabled={!friendEmail || shareMutation.isPending}
                onClick={() => shareMutation.mutate({ sharedWithEmail: friendEmail, permission })}
              >
                Share
              </button>
            </div>

            {/* ── Public link ── */}
            <div className="dash-settings-section">
              <div className="dash-settings-section-label"><Globe size={12} /> Public link</div>
              <button
                className="friend-action-btn"
                style={{ width: '100%' }}
                disabled={shareMutation.isPending}
                onClick={() => shareMutation.mutate({ isPublic: true, permission })}
              >
                Create public link ({permission})
              </button>
            </div>

            {/* ── Current shares ── */}
            <div className="dash-settings-section">
              <div className="dash-settings-section-label">Shared with</div>
              <div className="friend-list">
                {(sharesData?.shares ?? []).length === 0 && (
                  <span className="friends-empty-note">Not shared with anyone yet</span>
                )}
                {(sharesData?.shares ?? []).map((s) => (
                  <div key={s.id} className="friend-row">
                    <div className="friend-row-info">
                      <span className="friend-row-name">
                        {s.sharedWithUser ? s.sharedWithUser.name : 'Public link'}
                      </span>
                      <span className="friend-row-email">
                        {s.permission === 'edit' ? 'Can edit' : 'Can view'}
                      </span>
                    </div>
                    {s.shareToken && (
                      <button
                        className="friend-action-btn"
                        title="Copy link"
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/shared/${currentDashboard!.id}?token=${s.shareToken}`)}
                      >
                        <Copy size={11} />
                      </button>
                    )}
                    <button className="friend-action-btn friend-action-btn--danger" title="Revoke" onClick={() => revokeMutation.mutate(s.id)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Shared with me ── */}
        {sharedWithMe.length > 0 && (
          <div className="dash-settings-section">
            <div className="dash-settings-section-label">Shared with me</div>
            <div className="friend-list">
              {sharedWithMe.map(({ dashboard, owner, permission: p }) => (
                <a
                  key={dashboard.id}
                  href={`/shared/${dashboard.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="friend-row"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="friend-row-info">
                    <span className="friend-row-name">{dashboard.name}</span>
                    <span className="friend-row-email">by {owner.name} · {p}</span>
                  </div>
                  <ExternalLink size={12} color="var(--text-dim)" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
