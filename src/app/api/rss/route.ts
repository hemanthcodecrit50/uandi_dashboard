import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limited — retry in ${Math.ceil(rl.retryAfterMs / 1000)}s` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DashboardRSS/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }
    const xml = await res.text();

    const items: { title: string; link: string; pubDate: string; description: string; image?: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
      const block = match[1];
      const get = (tag: string) => {
        const m = block.match(
          new RegExp(
            `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>` +
            `|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
          ),
        );
        return m ? (m[1] ?? m[2] ?? '').trim() : '';
      };

      let description = get('description');
      if (!description) description = get('content:encoded');
      if (!description) description = get('media:description');

      let pubDate = get('pubDate');
      if (!pubDate) pubDate = get('dc:date');

      let image = '';
      const imgMatch = block.match(/<media:content[^>]*medium="image"[^>]*url="([^"]+)"/);
      if (imgMatch) image = imgMatch[1];

      items.push({
        title: get('title'),
        link: get('link') || get('guid'),
        pubDate,
        description: description.replace(/<[^>]+>/g, '').slice(0, 200),
        image: image || undefined,
      });
    }

    const titleMatch = xml.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/);
    const feedTitle = titleMatch ? (titleMatch[1] ?? titleMatch[2] ?? 'Feed').trim() : 'Feed';

    return NextResponse.json({ title: feedTitle, items });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 502 });
  }
}
