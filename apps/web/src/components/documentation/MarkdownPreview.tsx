import { useMemo } from 'react';
import './MarkdownPreview.css';

type MarkdownPreviewProps = {
  content: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const inlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

const parseTable = (lines: string[], start: number) => {
  const header = lines[start];
  const divider = lines[start + 1];

  if (!header?.includes('|') || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider ?? '')) {
    return null;
  }

  const rows: string[] = [];
  let index = start;

  while (index < lines.length && lines[index]?.includes('|')) {
    rows.push(lines[index]);
    index += 1;
  }

  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  const headings = cells(rows[0]);
  const bodyRows = rows.slice(2).map(cells);

  const html = [
    '<div class="markdown-table-wrap"><table><thead><tr>',
    ...headings.map((heading) => `<th>${inlineMarkdown(heading)}</th>`),
    '</tr></thead><tbody>',
    ...bodyRows.flatMap((row) => [
      '<tr>',
      ...row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`),
      '</tr>',
    ]),
    '</tbody></table></div>',
  ].join('');

  return { html, nextIndex: index };
};

const renderMarkdown = (content: string) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let index = 0;
  let listOpen = false;
  let codeOpen = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }
  };

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (line.trim().startsWith('```')) {
      closeList();

      if (codeOpen) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        codeOpen = false;
      } else {
        codeOpen = true;
      }

      index += 1;
      continue;
    }

    if (codeOpen) {
      codeBuffer.push(line);
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      closeList();
      html.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (!line.trim()) {
      closeList();
      html.push('<div class="markdown-gap"></div>');
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const listItem = /^\s*[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }

      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
      index += 1;
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
    index += 1;
  }

  closeList();

  if (codeOpen) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
  }

  return html.join('');
};

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <article
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
