import { google } from 'googleapis';
import { randomBytes } from 'crypto';

// Minimal scopes — request only what you need.
// gmail.readonly is sufficient for displaying emails.
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function generateAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',   // Required to receive a refresh_token
    prompt: 'consent',        // Force consent screen so refresh_token is always returned
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

// Cryptographically random state for CSRF protection
export function generateState(): string {
  return randomBytes(32).toString('hex');
}
