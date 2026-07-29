import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { publishDashboard } from '@/lib/serverDashboards';
import { mapDashboardError } from '@/lib/apiErrors';
import type { Dashboard, WidgetInstance } from '@/types';

export const runtime = 'nodejs';

// Publishes (creates or updates) a server-backed copy of a dashboard the
// caller authored locally. Body shape matches exportLayout()'s single-
// dashboard slice — this is the same JSON the Export button already
// produces, doubling as the local -> server migration path.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { dashboard?: Dashboard; widgets?: WidgetInstance[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.dashboard?.id || !Array.isArray(body.widgets)) {
    return NextResponse.json({ error: 'dashboard and widgets are required' }, { status: 400 });
  }

  try {
    publishDashboard(session.userId, body.dashboard, body.widgets);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapDashboardError(err);
  }
}
