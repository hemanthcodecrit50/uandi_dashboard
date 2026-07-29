import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listSharedWithMe } from '@/lib/serverDashboards';
import type { Dashboard } from '@/types';
import type { User } from '@/lib/userStore';

export const runtime = 'nodejs';

export interface SharedWithMeResponse {
  shared: { dashboard: Dashboard; owner: User; permission: 'view' | 'edit' }[];
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ shared: listSharedWithMe(session.userId) });
}
