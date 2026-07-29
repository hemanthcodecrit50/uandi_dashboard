import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createShare, listShares, type ShareRecord } from '@/lib/serverDashboards';
import { mapDashboardError } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export interface SharesResponse {
  shares: ShareRecord[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json({ shares: listShares(params.id, session.userId) });
  } catch (err) {
    return mapDashboardError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { sharedWithEmail?: string; permission?: 'view' | 'edit'; isPublic?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (body.permission !== 'view' && body.permission !== 'edit') {
    return NextResponse.json({ error: 'permission must be "view" or "edit"' }, { status: 400 });
  }

  try {
    const share = createShare(params.id, session.userId, {
      sharedWithEmail: body.sharedWithEmail,
      permission: body.permission,
      isPublic: body.isPublic,
    });
    return NextResponse.json({ share });
  } catch (err) {
    return mapDashboardError(err);
  }
}
