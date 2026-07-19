'use client';

import { useEffect } from 'react';
import { useDashboardStore } from '@/store';

export default function ThemeApplier() {
  const theme = useDashboardStore((s) => s.currentDashboard()?.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme?.backgroundColor) {
      root.style.setProperty('--bg', theme.backgroundColor);
    } else {
      root.style.removeProperty('--bg');
    }
    if (theme?.accentColor) {
      root.style.setProperty('--accent', theme.accentColor);
      root.style.setProperty('--accent-dim', `${theme.accentColor}14`);
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-dim');
    }
  }, [theme]);

  return null;
}
