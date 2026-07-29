'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import type { DashboardViewResponse } from '@/app/api/dashboards/[id]/route';

// Polling-based sync (Stage 5's "cheapest option" — good enough for "a
// friend edited my kanban board", not live cursors). React Query already
// dedupes/cancels in-flight requests, so a plain interval is enough.
const POLL_INTERVAL_MS = 4000;

export function useSharedDashboard(dashboardId: string, token?: string) {
  return useQuery<DashboardViewResponse>({
    queryKey: ['shared-dashboard', dashboardId, token],
    queryFn: () =>
      apiFetch<DashboardViewResponse>(
        `/api/dashboards/${dashboardId}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
      ),
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
}
