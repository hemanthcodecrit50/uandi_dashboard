import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listOwnedDashboards, type OwnedDashboardSummary } from '@/lib/serverDashboards';

export const runtime = 'nodejs';

export interface MyDashboardsResponse {
  dashboards: OwnedDashboardSummary[];
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ dashboards: listOwnedDashboards(session.userId) });
}
