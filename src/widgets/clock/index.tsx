'use client';

import { useEffect, useState } from 'react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';

export default function ClockWidget({ config }: WidgetProps) {
  const [time, setTime] = useState(() => new Date());
  const timezone = (config.timezone as string) || undefined; // undefined = system local

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(time);

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  }).format(time);

  // Split "HH:MM:SS" → hm = "HH:MM", secs = "SS"
  const colonIdx = timeStr.lastIndexOf(':');
  const hm = timeStr.slice(0, colonIdx);
  const ss = timeStr.slice(colonIdx + 1);

  return (
    <div className="widget-card" style={{ justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '24px' }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        fontWeight: 300,
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'baseline',
        gap: '2px',
      }}>
        <span>{hm}</span>
        <span style={{ color: 'var(--accent)', fontSize: '0.55em', fontWeight: 400 }}>:{ss}</span>
      </div>
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
        textAlign: 'center',
      }}>
        {dateStr}
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, var(--accent-dim) 0%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '12px',
      }} />
    </div>
  );
}

export const metadata = {
  id: 'ClockWidget',
  displayName: 'Clock',
  description: 'Live clock with date display',
  icon: 'Clock',
  defaultSize: { w: 4, h: 3 } as { w: number; h: number },
  minSize: { w: 3, h: 2 } as { w: number; h: number },
  capabilities: ['configurable'] as WidgetCapability[],
  tags: ['utility', 'time'],
  configurationSchema: {
    fields: [
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'text' as const,
        defaultValue: '',
        placeholder: 'e.g. America/New_York',
      },
    ],
  } as ConfigurationSchema,
};
