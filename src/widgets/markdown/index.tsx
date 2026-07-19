'use client';

import { useState } from 'react';
import { WidgetProps, WidgetCapability, ConfigurationSchema } from '@/types';
import { useDashboardStore } from '@/store';
import { Pencil, Check, Eye } from 'lucide-react';

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="md-code"><code>${code.trim()}</code></pre>`
  );
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  // bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');
  // unordered list
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = /(<li>)/.test(html) ? html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>') : html;
  // ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="md-hr" />');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');
  // line breaks → paragraphs
  html = html.replace(/\n\n+/g, '</p><p class="md-p">');
  html = `<p class="md-p">${html}</p>`;
  // clean empty p
  html = html.replace(/<p class="md-p"><\/p>/g, '');

  return html;
}

export default function MarkdownWidget({ id, config }: WidgetProps) {
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const [editing, setEditing] = useState(false);
  const [buffer, setBuffer] = useState('');

  const content = (config.content as string) || '*Nothing here yet*';

  const startEdit = () => { setBuffer(content); setEditing(true); };
  const save = () => { updateWidgetConfig(id, { content: buffer }); setEditing(false); };

  return (
    <div className="widget-card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
          Markdown
        </span>
        <button
          onClick={editing ? save : startEdit}
          className="md-edit-btn"
        >
          {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
        </button>
      </div>

      {editing ? (
        <textarea
          value={buffer}
          onChange={(e) => setBuffer(e.target.value)}
          className="md-editor"
          autoFocus
        />
      ) : (
        <div
          className="md-preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
}

export const metadata = {
  id: 'MarkdownWidget',
  displayName: 'Markdown',
  description: 'Write notes in Markdown',
  icon: 'FileCode',
  defaultSize: { w: 4, h: 4 } as { w: number; h: number },
  minSize: { w: 3, h: 3 } as { w: number; h: number },
  capabilities: ['shareable', 'exportable', 'configurable'] as WidgetCapability[],
  tags: ['productivity', 'text'],
  configurationSchema: {
    fields: [
      {
        key: 'content',
        label: 'Content',
        type: 'text' as const,
        defaultValue: '',
      },
    ],
  } as ConfigurationSchema,
};
