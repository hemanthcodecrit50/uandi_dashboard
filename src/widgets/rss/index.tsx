'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/store';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { Rss, ExternalLink, RefreshCw, Plus, X } from 'lucide-react';

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  image?: string;
}

interface FeedData {
  title: string;
  items: FeedItem[];
}

async function fetchFeed(url: string): Promise<FeedData> {
  const res = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Feed fetch failed');
  return res.json();
}

function FeedItemView({ item }: { item: FeedItem }) {
  const date = item.pubDate ? new Date(item.pubDate) : null;
  const dateStr = date && !isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
    : '';

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="rss-item"
    >
      {item.image && (
        <img src={item.image} alt="" className="rss-item-img" loading="lazy" />
      )}
      <div className="rss-item-content">
        <div className="rss-item-top">
          <span className="rss-item-title">{item.title}</span>
          <ExternalLink size={10} color="var(--text-dim)" />
        </div>
        {item.description && (
          <p className="rss-item-desc">{item.description}</p>
        )}
        {dateStr && <span className="rss-item-date">{dateStr}</span>}
      </div>
    </a>
  );
}

export default function RssWidget({ id, config }: WidgetProps) {
  const feedUrls = (config.feeds as string[]) ?? [];
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const [addingFeed, setAddingFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [selectedFeed, setSelectedFeed] = useState<string | null>(feedUrls[0] ?? null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['rss', selectedFeed],
    queryFn: () => fetchFeed(selectedFeed!),
    enabled: !!selectedFeed,
    staleTime: 300_000,
  });

  const addFeed = () => {
    const u = newFeedUrl.trim();
    if (!u) return;
    const next = [...feedUrls, u];
    updateWidgetConfig(id, { feeds: next });
    setSelectedFeed(u);
    setNewFeedUrl('');
    setAddingFeed(false);
  };

  const removeFeed = (url: string) => {
    const next = feedUrls.filter((f) => f !== url);
    updateWidgetConfig(id, { feeds: next });
    if (selectedFeed === url) setSelectedFeed(next[0] ?? null);
  };

  return (
    <div className="widget-card" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Rss size={14} color="var(--accent)" />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", flex: 1 }}>
          RSS Feed
        </span>
        {selectedFeed && (
          <button onClick={() => refetch()} className="rss-refresh" title="Refresh">
            <RefreshCw size={11} style={isFetching ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>
        )}
      </div>

      <div className="rss-tabs">
        {feedUrls.map((url) => (
          <button
            key={url}
            onClick={() => setSelectedFeed(url)}
            className={`rss-tab ${selectedFeed === url ? 'rss-tab--active' : ''}`}
          >
            <span className="rss-tab-label">{new URL(url).hostname.replace('www.', '')}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeFeed(url); }}
              className="rss-tab-del"
            >
              <X size={8} />
            </button>
          </button>
        ))}
        {addingFeed ? (
          <input
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addFeed(); if (e.key === 'Escape') { setAddingFeed(false); setNewFeedUrl(''); } }}
            onBlur={() => { if (newFeedUrl.trim()) addFeed(); else setAddingFeed(false); }}
            placeholder="https://…"
            className="rss-tab-input"
            autoFocus
          />
        ) : (
          <button onClick={() => setAddingFeed(true)} className="rss-tab-add">
            <Plus size={10} />
          </button>
        )}
      </div>

      <div className="rss-items">
        {!selectedFeed ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '12px 0', textAlign: 'center' }}>
            Add an RSS feed to get started
          </p>
        ) : isFetching && !data ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <RefreshCw size={16} color="var(--text-dim)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          data?.items.map((item, i) => <FeedItemView key={`${item.link}-${i}`} item={item} />)
        )}
      </div>
    </div>
  );
}

export const metadata = {
  id: 'RssWidget',
  displayName: 'RSS Feed',
  description: 'Read RSS/Atom feeds',
  icon: 'Rss',
  defaultSize: { w: 4, h: 5 } as { w: number; h: number },
  minSize: { w: 3, h: 3 } as { w: number; h: number },
  capabilities: ['configurable', 'realtime'] as WidgetCapability[],
  tags: ['productivity', 'news'],
  configurationSchema: {
    fields: [
      {
        key: 'feeds',
        label: 'Feed URLs',
        type: 'text' as const,
        defaultValue: [],
      },
    ],
  } as ConfigurationSchema,
};
