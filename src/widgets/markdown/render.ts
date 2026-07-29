// Pure markdown -> HTML renderer, deliberately dependency-free (no store,
// no registry, no React) so it can be imported from anywhere — e.g. the
// shared-dashboard viewer — without pulling in the widget's store bindings
// and tripping the store <-> registry <-> widgets circular import.
export function renderMarkdown(text: string): string {
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
  // tables (GFM-style: header row, separator row, body rows)
  html = html.replace(
    /^\|(.+)\|[ \t]*\r?\n\|(?:[ \t]*:?-+:?[ \t]*\|)+[ \t]*\r?\n((?:\|.*\|[ \t]*\r?\n?)+)/gm,
    (_match, headerLine, bodyBlock) => {
      const splitRow = (row: string) =>
        row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

      const headers = splitRow(headerLine);
      const bodyRows = bodyBlock
        .split(/\r?\n/)
        .filter((line: string) => line.trim())
        .map(splitRow);

      const thead = `<thead><tr>${headers.map((h) => `<th class="md-th">${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${bodyRows
        .map((cells: string[]) => `<tr>${cells.map((c) => `<td class="md-td">${c}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;

      return `<table class="md-table">${thead}${tbody}</table>\n`;
    },
  );
  // blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');
  // unordered list items
  html = html.replace(/^[\*\-] (.+)$/gm, '<li class="md-li">$1</li>');
  // ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-li md-li-ordered">$1</li>');

  // wrap consecutive unordered <li> in <ul>
  html = html.replace(/((?:<li class="md-li">[\s\S]*?<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');
  // wrap consecutive ordered <li> in <ol>
  html = html.replace(/((?:<li class="md-li md-li-ordered">[\s\S]*?<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

  // horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="md-hr" />');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');
  // images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="md-img" src="$2" alt="$1" />');
  // line breaks → paragraphs (skip block elements)
  const lines = html.split('\n');
  const blocks: string[] = [];
  let buf = '';
  const isBlock = (l: string) => /^\s*<(h[1-6]|ul|ol|li|pre|blockquote|hr|div|table|p )/.test(l);

  for (const line of lines) {
    if (line.trim() === '') {
      if (buf.trim()) blocks.push(buf.trim());
      buf = '';
    } else if (isBlock(line)) {
      if (buf.trim()) blocks.push(buf.trim());
      blocks.push(line);
      buf = '';
    } else {
      buf += (buf ? '\n' : '') + line;
    }
  }
  if (buf.trim()) blocks.push(buf.trim());

  html = blocks
    .map((b) => {
      if (/^\s*<(h[1-6]|ul|ol|pre|blockquote|hr|div|table)/.test(b)) return b;
      return `<p class="md-p">${b}</p>`;
    })
    .join('\n');

  return html;
}
