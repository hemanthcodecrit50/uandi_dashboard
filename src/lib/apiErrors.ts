import { NextResponse } from 'next/server';
import { AccessError, NotFoundError } from './serverDashboards';

// Maps the domain errors thrown by serverDashboards.ts to HTTP responses.
// Re-throws anything else so it surfaces as a 500 with a real stack trace.
export function mapDashboardError(err: unknown): NextResponse {
  if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
  if (err instanceof AccessError) return NextResponse.json({ error: err.message }, { status: 403 });
  throw err;
}
