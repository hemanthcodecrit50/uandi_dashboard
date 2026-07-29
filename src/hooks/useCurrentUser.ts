'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';
import type { MeResponse } from '@/app/api/auth/me/route';

export function useCurrentUser() {
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/api/auth/me'),
    staleTime: 5 * 60_000,
    retry: false,
  });

  return { user: data?.user ?? null, isLoading };
}
