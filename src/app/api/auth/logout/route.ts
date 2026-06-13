import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/session';
import { tokenStore } from '@/lib/tokenStore';
import { invalidateUserCache } from '@/lib/gmailClient';

export const runtime = 'nodejs';

// Deletes stored tokens, invalidates the email cache, and clears the session cookie.
export async function POST(): Promise<NextResponse> {
  const session = await getSession();

  if (session) {
    await tokenStore.delete(session.userId);
    invalidateUserCache(session.userId);
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
