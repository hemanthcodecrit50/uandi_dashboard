import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createOAuthClient } from '@/lib/googleAuth';
import { tokenStore } from '@/lib/tokenStore';
import { createSessionToken, setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

// Google redirects here after the user grants (or denies) consent.
// Exchanges the authorization code for tokens, stores them encrypted,
// and sets a session cookie on the response.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code        = searchParams.get('code');
  const state       = searchParams.get('state');
  const oauthError  = searchParams.get('error');
  const storedState = req.cookies.get('oauth_state')?.value;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // User denied access
  if (oauthError) {
    return NextResponse.redirect(`${appUrl}?error=oauth_denied`);
  }

  // Validate CSRF state
  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}?error=invalid_state`);
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      // refresh_token is only provided on first consent. If missing, the user
      // already connected before. Revoking and re-authorising fixes this.
      return NextResponse.redirect(`${appUrl}?error=missing_refresh_token`);
    }

    // Fetch the user's profile (email, name, picture)
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.id || !profile.email) {
      return NextResponse.redirect(`${appUrl}?error=missing_profile`);
    }

    // Store tokens encrypted at rest (never in the browser)
    await tokenStore.set(profile.id, {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    tokens.expiry_date ?? Date.now() + 3_600_000,
      email:        profile.email,
      name:         profile.name  ?? profile.email,
      picture:      profile.picture ?? '',
    });

    // Create a signed session JWT and set it as an HTTP-only cookie
    const sessionToken = await createSessionToken({ userId: profile.id, email: profile.email });
    const res = NextResponse.redirect(`${appUrl}?connected=gmail`);
    setSessionCookie(res, sessionToken);
    res.cookies.set('oauth_state', '', { maxAge: 0, path: '/' }); // clear CSRF cookie

    return res;
  } catch (err) {
    console.error('[auth/callback]', err);
    return NextResponse.redirect(`${appUrl}?error=auth_failed`);
  }
}
