const ANILIST_URL = 'https://graphql.anilist.co';

export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  description: string | null;
  status: string;
  episodes: number | null;
  nextAiringEpisode: {
    episode: number;
    timeUntilAiring: number;
  } | null;
  averageScore: number | null;
  genres: string[];
}

export interface SearchResult {
  id: number;
  title: string;
  coverImage: string;
}

const SEARCH_QUERY = `
  query SearchAnime($search: String) {
    Page(page: 1, perPage: 8) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { medium }
      }
    }
  }
`;

const DETAIL_QUERY = `
  query AnimeDetail($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      coverImage { large }
      description(asHtml: false)
      status
      episodes
      averageScore
      genres
      nextAiringEpisode { episode timeUntilAiring }
    }
  }
`;

async function gql(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList request failed: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

export async function searchAnime(search: string): Promise<SearchResult[]> {
  const data = await gql(SEARCH_QUERY, { search });
  const page = data.Page as { media: Array<{ id: number; title: { romaji: string; english: string | null }; coverImage: { medium: string } }> };
  return page.media.map((m) => ({
    id: m.id,
    title: m.title.english || m.title.romaji,
    coverImage: m.coverImage.medium,
  }));
}

export async function getAnimeDetail(id: number): Promise<AniListMedia> {
  const data = await gql(DETAIL_QUERY, { id });
  return data.Media as AniListMedia;
}

export function formatTimeUntilAiring(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
