'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';

// Client Component boundary for QueryClientProvider.
// The QueryClient is a class instance and cannot be created in a Server
// Component and passed across the server→client boundary as a prop — Next.js
// can only serialize plain objects. Creating it here keeps it client-side.
export default function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
