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
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Missing username param' }, { status: 400 });
  }

  const headers = {
    'User-Agent': 'PersonalDashboard/1.0',
    'Accept': 'application/vnd.github.v3+json',
  };

  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!userRes.ok) {
      const msg = userRes.status === 404
        ? 'GitHub user not found'
        : userRes.status === 403
          ? 'GitHub API rate limit exceeded — try again later'
          : `GitHub API error (${userRes.status})`;
      return NextResponse.json({ error: msg, rateLimited: userRes.status === 403 }, { status: userRes.status });
    }

    const user = await userRes.json();

    const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=15`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    let events: unknown[] = [];
    let rateLimited = false;

    if (eventsRes.ok) {
      const raw = await eventsRes.json();
      events = Array.isArray(raw) ? raw : [];
    } else if (eventsRes.status === 403) {
      rateLimited = true;
    }

    const filtered = (events as Record<string, unknown>[]).filter((e) =>
      e.type === 'PushEvent' || e.type === 'CreateEvent' ||
      e.type === 'StarEvent' || e.type === 'IssuesEvent' || e.type === 'PullRequestEvent'
    ).slice(0, 10);

    return NextResponse.json({ user, events: filtered, rateLimited });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 502 });
  }
}
