import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  try {
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    return NextResponse.json({ status: 'ok', db: row.ok === 1 ? 'ok' : 'error' });
  } catch (err) {
    console.error('[health]', err);
    return NextResponse.json({ status: 'error', message: 'Database unavailable' }, { status: 503 });
  }
}
