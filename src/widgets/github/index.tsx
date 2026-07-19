'use client';

import { useQuery } from '@tanstack/react-query';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { GitBranch, GitCommit, Star, AlertCircle, RefreshCw, ExternalLink, Radio } from 'lucide-react';

interface GhEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
}

interface GhUser {
  login: string;
  avatar_url: string;
}

const EVENT_ICONS: Record<string, typeof GitBranch> = {
  PushEvent: GitCommit,
  CreateEvent: GitBranch,
  StarEvent: Star,
  IssuesEvent: AlertCircle,
  PullRequestEvent: GitBranch,
  ForkEvent: GitBranch,
  ReleaseEvent: Star,
  DeleteEvent: GitBranch,
};

const EVENT_LABELS: Record<string, string> = {
  PushEvent: 'pushed to',
  CreateEvent: 'created',
  StarEvent: 'starred',
  IssuesEvent: 'opened issue in',
  PullRequestEvent: 'PR in',
  ForkEvent: 'forked',
  ReleaseEvent: 'released',
  DeleteEvent: 'deleted branch in',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

async function fetchGitHubActivity(username: string): Promise<{ user: GhUser; events: GhEvent[] }> {
  const [userRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`),
    fetch(`https://api.github.com/users/${username}/events?per_page=15`),
  ]);
  if (!userRes.ok) throw new Error('User not found');
  const user = await userRes.json();
  const events = await eventsRes.json();
  return { user, events: events.filter((e: GhEvent) => e.type === 'PushEvent' || e.type === 'CreateEvent' || e.type === 'StarEvent' || e.type === 'IssuesEvent' || e.type === 'PullRequestEvent').slice(0, 10) };
}

function EventRow({ event }: { event: GhEvent }) {
  const Icon = EVENT_ICONS[event.type] || GitBranch;
  const label = EVENT_LABELS[event.type] || event.type;
  const repoName = event.repo.name.split('/').slice(1).join('/');
  const count = event.type === 'PushEvent' ? (event.payload.commits as unknown[])?.length ?? 0 : 0;

  return (
    <div className="gh-event">
      <Icon size={12} color="var(--text-dim)" />
      <div className="gh-event-text">
        <span className="gh-event-action">{label}</span>
        <span className="gh-event-repo">{repoName}</span>
        {count > 0 && <span className="gh-event-count">{count} commit{count !== 1 ? 's' : ''}</span>}
      </div>
      <span className="gh-event-time">{timeAgo(event.created_at)}</span>
    </div>
  );
}

export default function GitHubWidget({ config }: WidgetProps) {
  const username = (config.username as string) ?? '';

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['gh-activity', username],
    queryFn: () => fetchGitHubActivity(username),
    enabled: username.length > 0,
    staleTime: 300_000,
  });

  if (!username) {
    return (
      <div className="widget-card" style={{ padding: '20px', justifyContent: 'center', alignItems: 'center' }}>
        <Radio size={20} color="var(--text-dim)" />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
          Set a GitHub username in widget settings.
        </p>
      </div>
    );
  }

  return (
    <div className="widget-card" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {data?.user.avatar_url && (
          <img
            src={data.user.avatar_url}
            alt=""
            style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)' }}
          />
        )}
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", flex: 1 }}>
          {username}
        </span>
        <button onClick={() => refetch()} className="rss-refresh" title="Refresh">
          <RefreshCw size={11} style={isFetching ? { animation: 'spin 1s linear infinite' } : undefined} />
        </button>
      </div>

      <div className="gh-events">
        {isFetching && !data ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <RefreshCw size={16} color="var(--text-dim)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : data?.events.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
            No recent activity
          </p>
        ) : (
          data?.events.map((ev) => <EventRow key={ev.id} event={ev} />)
        )}
      </div>
    </div>
  );
}

export const metadata = {
  id: 'GitHubWidget',
  displayName: 'GitHub Activity',
  description: 'Recent activity from a GitHub user',
  icon: 'GitBranch',
  defaultSize: { w: 4, h: 4 } as { w: number; h: number },
  minSize: { w: 3, h: 3 } as { w: number; h: number },
  capabilities: ['configurable', 'realtime'] as WidgetCapability[],
  tags: ['development', 'social'],
  configurationSchema: {
    fields: [
      {
        key: 'username',
        label: 'GitHub Username',
        type: 'text' as const,
        defaultValue: '',
        placeholder: 'e.g. torvalds',
      },
    ],
  } as ConfigurationSchema,
};
