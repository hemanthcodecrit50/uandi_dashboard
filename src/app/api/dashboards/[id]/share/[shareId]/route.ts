import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { revokeShare } from '@/lib/serverDashboards';
import { mapDashboardError } from '@/lib/apiErrors';

export const runtime = 'nodejs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; shareId: string } },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    revokeShare(params.shareId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapDashboardError(err);
  }
}
