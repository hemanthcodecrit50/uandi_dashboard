import { NextResponse } from 'next/server';
import { generateAuthUrl, generateState } from '@/lib/googleAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Redirects the user to Google's OAuth consent screen.
// A CSRF state token is stored in a short-lived HTTP-only cookie.
export async function GET(): Promise<NextResponse> {
  const state = generateState();
  const authUrl = generateAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes — long enough for the consent flow
    path: '/',
  });

  return res;
}
