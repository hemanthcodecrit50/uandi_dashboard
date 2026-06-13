import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { tokenStore } from '@/lib/tokenStore';

export const runtime = 'nodejs';

export interface MeResponse {
  user: { id: string; email: string; name: string; picture: string } | null;
}

// Returns the currently authenticated user's public profile, or null.
// Safe to call frequently — reads session from cookie, no external API call.
export async function GET(): Promise<NextResponse<MeResponse>> {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  const tokens = await tokenStore.get(session.userId);
  if (!tokens) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id:      session.userId,
      email:   tokens.email,
      name:    tokens.name,
      picture: tokens.picture,
    },
  });
}
