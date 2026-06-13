const REQUIRED = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'SESSION_SECRET',
  'TOKEN_ENCRYPTION_KEY',
] as const;

let _validated = false;

export function validateEnv(): void {
  if (_validated) return;
  _validated = true;
  // During `next build`, Next.js collects page data without real env vars — skip.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  ${k}`).join('\n')}\n\nCopy .env.local.example to .env.local and fill in the values.`
    );
  }

  const sessionSecret = process.env.SESSION_SECRET ?? '';
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }

  const encKey = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  if (encKey.length !== 64 || !/^[0-9a-f]+$/i.test(encKey)) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters.\n' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
}
