import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Missing username param' }, { status: 400 });
  }

  try {
    const [userRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { 'User-Agent': 'DashboardGH/1.0', Accept: 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=15`, {
        headers: { 'User-Agent': 'DashboardGH/1.0', Accept: 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    if (!userRes.ok) {
      const msg = userRes.status === 404 ? 'User not found' : `GitHub ${userRes.status}`;
      return NextResponse.json({ error: msg }, { status: userRes.status });
    }

    const user = await userRes.json();
    const rawEvents = await eventsRes.json();
    const eventArray = Array.isArray(rawEvents) ? rawEvents : [];

    const filtered = eventArray.filter((e: Record<string, unknown>) =>
      e?.type === 'PushEvent' || e?.type === 'CreateEvent' ||
      e?.type === 'StarEvent' || e?.type === 'IssuesEvent' || e?.type === 'PullRequestEvent'
    ).slice(0, 10);

    return NextResponse.json({ user, events: filtered });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 502 });
  }
}
