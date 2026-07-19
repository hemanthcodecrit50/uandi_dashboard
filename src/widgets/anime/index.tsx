'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WidgetProps, WidgetCapability } from '@/types';
import { useDashboardStore } from '@/store';
import { searchAnime, getAnimeDetail, formatTimeUntilAiring } from '@/services/anilist';
import { Search, Tv, Clock, Star, X } from 'lucide-react';

// ─── Search panel ─────────────────────────────────────────────────────────────

interface SearchPanelProps {
  hasSelection: boolean;
  onSelect(id: number): void;
  onBack(): void;
}

function SearchPanel({ hasSelection, onSelect, onBack }: SearchPanelProps) {
  const [query, setQuery] = useState('');

  const { data: results, isFetching } = useQuery({
    queryKey: ['anime-search', query],
    queryFn: () => searchAnime(query),
    enabled: query.length > 1,
    staleTime: 60_000,
  });

  return (
    <div className="widget-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Tv size={16} color="var(--accent)" />
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
          Anime Tracker
        </span>
      </div>

      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime…"
          autoFocus
          className="anime-search-input"
          style={{
            width: '100%',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            fontSize: '0.85rem',
            padding: '8px 10px 8px 32px',
            outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>

      {isFetching && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '8px 0' }}>Searching…</p>
      )}

      {results && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '180px' }}>
          {results.map((r) => (
            <button key={r.id} onClick={() => onSelect(r.id)} className="anime-search-result">
              {r.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.coverImage} alt="" style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
            </button>
          ))}
        </div>
      )}

      {!query && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
          Search for an anime to track its airing schedule.
        </p>
      )}

      {hasSelection && (
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0', marginTop: '8px' }}
        >
          ← Back
        </button>
      )}
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  animeId: number;
  onClear(): void;
  onChangeAnime(): void;
}

function DetailPanel({ animeId, onClear, onChangeAnime }: DetailPanelProps) {
  const { data: anime, isLoading, error } = useQuery({
    queryKey: ['anime-detail', animeId],
    queryFn: () => getAnimeDetail(animeId),
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <div className="widget-card" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="widget-card" style={{ padding: '20px' }}>
        <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>Failed to load anime data.</p>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.82rem' }}>
          Try again
        </button>
      </div>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const rawDesc = anime.description?.replace(/<[^>]*>/g, '') ?? '';
  const desc = rawDesc.length > 150 ? rawDesc.slice(0, 150) + '…' : rawDesc;

  return (
    <div className="widget-card" style={{ overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: '120px', flexShrink: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anime.coverImage.large} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--surface) 100%)' }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '40px' }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.8)', lineHeight: 1.3 }}>
            {title}
          </h3>
        </div>
        <button
          onClick={onClear}
          title="Change anime"
          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={12} />
        </button>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {anime.averageScore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} color="var(--amber)" fill="var(--amber)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{anime.averageScore / 10}/10</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tv size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {anime.status === 'RELEASING' ? 'Airing' : anime.status === 'FINISHED' ? 'Finished' : anime.status}
              {anime.episodes ? ` · ${anime.episodes} eps` : ''}
            </span>
          </div>
        </div>

        {anime.nextAiringEpisode && (
          <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(124,106,255,0.2)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={13} color="var(--accent)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>EP {anime.nextAiringEpisode.episode}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {formatTimeUntilAiring(anime.nextAiringEpisode.timeUntilAiring)}</div>
            </div>
          </div>
        )}

        {anime.genres.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {anime.genres.slice(0, 4).map((g) => (
              <span key={g} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '0.68rem', padding: '2px 6px' }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {desc && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>{desc}</p>
        )}

        <button onClick={onChangeAnime} className="anime-change-btn">
          Change anime
        </button>
      </div>
    </div>
  );
}

// ─── Coordinator ──────────────────────────────────────────────────────────────

export default function AnimeWidget({ id, config }: WidgetProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const [showSearch, setShowSearch] = useState(false);

  const animeId = config.animeId as number | undefined;

  const handleSelect = (selectedId: number) => {
    updateWidgetConfig(id, { animeId: selectedId });
    setShowSearch(false);
  };

  const handleClear = () => {
    updateWidgetConfig(id, { animeId: undefined });
    setShowSearch(false);
  };

  if (!animeId || showSearch) {
    return (
      <SearchPanel
        hasSelection={!!animeId}
        onSelect={handleSelect}
        onBack={() => setShowSearch(false)}
      />
    );
  }

  return (
    <DetailPanel
      animeId={animeId}
      onClear={handleClear}
      onChangeAnime={() => setShowSearch(true)}
    />
  );
}

export const metadata = {
  id: 'AnimeWidget',
  displayName: 'Anime Tracker',
  description: 'Track airing schedules from AniList',
  icon: 'Tv',
  defaultSize: { w: 4, h: 5 } as { w: number; h: number },
  minSize: { w: 3, h: 4 } as { w: number; h: number },
  capabilities: ['shareable', 'searchable', 'realtime'] as WidgetCapability[],
  tags: ['entertainment', 'media'],
};
