'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/store';
import Renderer from '@/renderer';
import { useContainerWidth } from '@/hooks/useContainerWidth';

// Isolated client component responsible only for:
// 1. Hydrating the store from localStorage on mount.
// 2. Measuring the container width for the grid.
// Previously this logic lived in page.tsx forcing the whole page to be a client component.
export default function DashboardCanvas() {
  const loadLayout = useDashboardStore((s) => s.loadLayout);
  const [containerRef, width] = useContainerWidth();

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {width > 0 && <Renderer width={width} />}
    </div>
  );
}
