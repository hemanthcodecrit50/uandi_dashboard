import '@testing-library/jest-dom/extend-expect';

// Any test that imports src/lib/db.ts (directly or transitively, e.g. via
// userStore/friendStore/serverDashboards) triggers validateEnv() and DB
// initialization at module-load time. Provide safe defaults — an in-memory
// SQLite DB so tests never touch the real dev database file — before any
// test file's own imports run. Individual tests may still override these.
process.env.DB_PATH ||= ':memory:';
process.env.GOOGLE_CLIENT_ID ||= 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET ||= 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI ||= 'http://localhost:3000/api/auth/callback';
process.env.SESSION_SECRET ||= 'a'.repeat(32);
process.env.TOKEN_ENCRYPTION_KEY ||= '0'.repeat(64);
