import { QueryClient } from '@tanstack/react-query';

// A module-level singleton is correct here because Next.js Server Components
// call getQueryClient() during SSR; we want one instance per server render.
// On the client the module is evaluated once, so this is also a stable reference.
// Previously queryClient was defined at module level inside page.tsx which is
// fine but conflated the provider concern with the page layout concern.
let client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (client) return client;
  client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
  return client;
}
