'use client';

import { useState, useEffect, useRef } from 'react';

// Initial width 0, not 1200 — page guards with {width > 0 && ...} so no flash.
// Starting at 1200 caused an SSR/hydration mismatch: server rendered at 1200,
// client measured a different value, React warned and re-rendered unnecessarily.
export function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Read the real width immediately after mount.
    setWidth(el.offsetWidth);
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
