import Providers from '@/lib/Providers';
import Toolbar from '@/components/Toolbar';
import DashboardCanvas from '@/components/DashboardCanvas';
import ThemeApplier from '@/components/ThemeApplier';

// This is a Server Component — no 'use client' needed.
// QueryClientProvider and data fetching concerns live in their own client component (Providers).
export default function Page() {
  return (
    <Providers>
      <ThemeApplier />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <Toolbar />
        <main style={{ flex: 1, padding: '16px 20px' }}>
          <DashboardCanvas />
        </main>
      </div>
    </Providers>
  );
}
