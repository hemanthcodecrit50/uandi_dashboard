'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, X, UserPlus, Check, Trash2 } from 'lucide-react';
import { apiFetch, apiPost, apiDelete } from '@/lib/apiClient';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { FriendsResponse } from '@/app/api/friends/route';
import type { UserSearchResponse } from '@/app/api/users/search/route';

interface FriendsPanelProps {
  onClose: () => void;
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return <div className="friend-avatar">{initial}</div>;
}

export default function FriendsPanel({ onClose }: FriendsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const { data: friendsData, isLoading: friendsLoading } = useQuery<FriendsResponse>({
    queryKey: ['friends'],
    queryFn: () => apiFetch<FriendsResponse>('/api/friends'),
    enabled: !!user,
    staleTime: 15_000,
  });

  const { data: searchData } = useQuery<UserSearchResponse>({
    queryKey: ['user-search', query],
    queryFn: () => apiFetch<UserSearchResponse>(`/api/users/search?q=${encodeURIComponent(query)}`),
    enabled: !!user && query.trim().length >= 2,
  });

  const invalidateFriends = () => queryClient.invalidateQueries({ queryKey: ['friends'] });

  const sendRequestMutation = useMutation({
    mutationFn: (email: string) => apiPost('/api/friends/request', { email }),
    onSuccess: () => { setFeedback('Request sent'); setQuery(''); invalidateFriends(); },
    onError: (err: Error) => setFeedback(err.message),
  });

  const respondMutation = useMutation({
    mutationFn: ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) =>
      apiPost('/api/friends/respond', { friendshipId, accept }),
    onSuccess: invalidateFriends,
  });

  const removeMutation = useMutation({
    mutationFn: (friendshipId: string) => apiDelete(`/api/friends/${friendshipId}`),
    onSuccess: invalidateFriends,
  });

  if (!user) {
    return (
      <div ref={panelRef} className="dash-settings-panel">
        <div className="dash-settings-header">
          <Users size={13} color="var(--accent)" />
          <span className="dash-settings-title">Friends</span>
          <button onClick={onClose} className="config-panel-close"><X size={12} /></button>
        </div>
        <div className="dash-settings-body">
          <p className="friends-empty-note">Connect your Google account (Gmail widget) to add friends and share dashboards.</p>
        </div>
      </div>
    );
  }

  const friends = friendsData?.friends ?? [];
  const incoming = friendsData?.incoming ?? [];
  const outgoing = friendsData?.outgoing ?? [];

  return (
    <div ref={panelRef} className="dash-settings-panel">
      <div className="dash-settings-header">
        <Users size={13} color="var(--accent)" />
        <span className="dash-settings-title">Friends</span>
        <button onClick={onClose} className="config-panel-close"><X size={12} /></button>
      </div>

      <div className="dash-settings-body">
        {/* ── Add friend ── */}
        <div className="dash-settings-section">
          <div className="dash-settings-section-label">
            <UserPlus size={12} />
            Add Friend
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFeedback(null); }}
            placeholder="Search by name or email…"
            className="config-input"
          />
          {feedback && <span className="friends-feedback">{feedback}</span>}
          {query.trim().length >= 2 && (
            <div className="friend-list">
              {(searchData?.users ?? []).length === 0 && (
                <span className="friends-empty-note">No matching users</span>
              )}
              {(searchData?.users ?? []).map((u) => (
                <div key={u.id} className="friend-row">
                  <Avatar name={u.name} />
                  <div className="friend-row-info">
                    <span className="friend-row-name">{u.name}</span>
                    <span className="friend-row-email">{u.email}</span>
                  </div>
                  <button
                    className="friend-action-btn friend-action-btn--accent"
                    disabled={sendRequestMutation.isPending}
                    onClick={() => sendRequestMutation.mutate(u.email)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Incoming requests ── */}
        {incoming.length > 0 && (
          <div className="dash-settings-section">
            <div className="dash-settings-section-label">Requests</div>
            <div className="friend-list">
              {incoming.map((r) => (
                <div key={r.friendshipId} className="friend-row">
                  <Avatar name={r.from.name} />
                  <div className="friend-row-info">
                    <span className="friend-row-name">{r.from.name}</span>
                    <span className="friend-row-email">{r.from.email}</span>
                  </div>
                  <button
                    className="friend-action-btn friend-action-btn--accent"
                    title="Accept"
                    onClick={() => respondMutation.mutate({ friendshipId: r.friendshipId, accept: true })}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    className="friend-action-btn"
                    title="Reject"
                    onClick={() => respondMutation.mutate({ friendshipId: r.friendshipId, accept: false })}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Outgoing requests ── */}
        {outgoing.length > 0 && (
          <div className="dash-settings-section">
            <div className="dash-settings-section-label">Sent</div>
            <div className="friend-list">
              {outgoing.map((r) => (
                <div key={r.friendshipId} className="friend-row">
                  <Avatar name={r.to.name} />
                  <div className="friend-row-info">
                    <span className="friend-row-name">{r.to.name}</span>
                    <span className="friend-row-email">Pending…</span>
                  </div>
                  <button
                    className="friend-action-btn"
                    title="Cancel request"
                    onClick={() => removeMutation.mutate(r.friendshipId)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Friends ── */}
        <div className="dash-settings-section">
          <div className="dash-settings-section-label">
            Friends {friends.length > 0 && `(${friends.length})`}
          </div>
          {friendsLoading && <span className="friends-empty-note">Loading…</span>}
          {!friendsLoading && friends.length === 0 && (
            <span className="friends-empty-note">No friends yet — search above to add some.</span>
          )}
          <div className="friend-list">
            {friends.map(({ friendshipId, user: f }) => (
              <div key={friendshipId} className="friend-row">
                <Avatar name={f.name} />
                <div className="friend-row-info">
                  <span className="friend-row-name">{f.name}</span>
                  <span className="friend-row-email">{f.email}</span>
                </div>
                <button
                  className="friend-action-btn friend-action-btn--danger"
                  title="Remove friend"
                  onClick={() => removeMutation.mutate(friendshipId)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
