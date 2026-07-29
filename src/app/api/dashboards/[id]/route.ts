import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  getDashboardForViewer,
  saveDashboardEdits,
  unpublishDashboard,
  type WidgetEdit,
  type AccessRole,
} from '@/lib/serverDashboards';
import { mapDashboardError } from '@/lib/apiErrors';
import type { Dashboard, WidgetInstance } from '@/types';
import type { User } from '@/lib/userStore';

export const runtime = 'nodejs';

export interface DashboardViewResponse {
  dashboard: Dashboard;
  widgets: WidgetInstance[];
  role: AccessRole;
  owner: User | null;
}

// Anonymous viewing is allowed via ?token=<share token> for public links —
// getSession() returning null just means viewerId is null, which
// getDashboardForViewer already treats as "check the token, not friendship".
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession();
  const token = req.nextUrl.searchParams.get('token') ?? undefined;

  try {
    const view = getDashboardForViewer(params.id, session?.userId ?? null, token);
    return NextResponse.json(view satisfies DashboardViewResponse);
  } catch (err) {
    return mapDashboardError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { edits?: WidgetEdit[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!Array.isArray(body.edits)) {
    return NextResponse.json({ error: 'edits array is required' }, { status: 400 });
  }

  try {
    const result = saveDashboardEdits(params.id, session.userId, body.edits);
    return NextResponse.json(result);
  } catch (err) {
    return mapDashboardError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    unpublishDashboard(params.id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapDashboardError(err);
  }
}
