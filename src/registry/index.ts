import { WidgetDefinition } from '@/types';
import { ClockWidgetDef } from '@/widgets/clock';
import { TextWidgetDef } from '@/widgets/text';
import { AnimeWidgetDef } from '@/widgets/anime';
import { GmailWidgetDef } from '@/widgets/gmail';

// Add new widgets here — everything else discovers them automatically.
const WIDGETS: Record<string, WidgetDefinition> = {
  [ClockWidgetDef.id]: ClockWidgetDef,
  [TextWidgetDef.id]: TextWidgetDef,
  [AnimeWidgetDef.id]: AnimeWidgetDef,
  [GmailWidgetDef.id]: GmailWidgetDef,
};

// Default layout lives here — it references widget IDs that the registry owns.
// Previously this lived in persistence.ts, coupling the storage layer to widget identities.
import type { WidgetNode } from '@/types';

export const DEFAULT_WIDGETS: WidgetNode[] = [
  {
    id: 'clock-default',
    component: ClockWidgetDef.id,
    layout: { x: 0, y: 0, w: 4, h: 3 },
    config: {},
  },
  {
    id: 'text-default',
    component: TextWidgetDef.id,
    layout: { x: 4, y: 0, w: 5, h: 3 },
    config: {
      title: 'Welcome',
      content: 'This is your personal dashboard.\nClick "Edit" to start customising.',
    },
  },
  {
    id: 'anime-default',
    component: AnimeWidgetDef.id,
    layout: { x: 0, y: 3, w: 4, h: 5 },
    config: {},
  },
];

export const widgetRegistry = {
  get(id: string): WidgetDefinition | undefined {
    return WIDGETS[id];
  },
  getAll(): WidgetDefinition[] {
    return Object.values(WIDGETS);
  },
};
