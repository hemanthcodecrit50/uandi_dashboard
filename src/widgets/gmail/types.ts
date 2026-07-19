import { AlertTriangle, Clock, Info } from 'lucide-react';
import type { Urgency } from '@/lib/gmailClient';

export const URGENCY: Record<Urgency, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  critical: { label: 'Critical', color: '#ff5f57', Icon: AlertTriangle },
  high:     { label: 'High',     color: '#f5a623', Icon: AlertTriangle },
  medium:   { label: 'Medium',   color: '#7c6aff', Icon: Clock },
  low:      { label: 'Low',      color: '#6b6b75', Icon: Info },
};

export type FilterKey = Urgency | 'all';

export const FILTERS: { key: FilterKey; label: string; color?: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical', color: '#ff5f57' },
  { key: 'high',     label: 'High',     color: '#f5a623' },
  { key: 'medium',   label: 'Medium',   color: '#7c6aff' },
  { key: 'low',      label: 'Low',      color: '#6b6b75' },
];
