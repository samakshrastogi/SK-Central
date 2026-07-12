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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const inlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const target = href.startsWith('#') ? '' : ' target="_blank" rel="noreferrer"';
      return `<a href="${href}"${target}>${label}</a>`;
    });

const parseFlowNode = (value: string) => {
  const label = /(?:[A-Za-z0-9_-]+)\["([^"]+)"\]/.exec(value)?.[1]
    ?? /(?:[A-Za-z0-9_-]+)\['([^']+)'\]/.exec(value)?.[1]
    ?? /(?:[A-Za-z0-9_-]+)\[([^\]]+)\]/.exec(value)?.[1]
    ?? value.replace(/[()[\]{}"]/g, '').trim();

  return inlineMarkdown(label);
};

const renderFlowchart = (content: string) => {
  const edgePairs = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().startsWith('flowchart') && !line.toLowerCase().startsWith('graph'))
    .map((line) => line.split(/-->|---|==>/).map((part) => part.trim()))
    .filter((parts) => parts.length >= 2);

  if (!edgePairs.length) {
    return `<pre><code>${escapeHtml(content)}</code></pre>`;
  }

  const nodeKey = (value: string) => value.split(/[\[({]/)[0].trim();
  const labels = new Map<string, string>();
  const children = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();

  edgePairs.forEach(([from, to]) => {
    const fromKey = nodeKey(from);
    const toKey = nodeKey(to);
    labels.set(fromKey, parseFlowNode(from));
    labels.set(toKey, parseFlowNode(to));
    children.set(fromKey, new Set([...(children.get(fromKey) ?? []), toKey]));
    parents.set(toKey, new Set([...(parents.get(toKey) ?? []), fromKey]));
  });

  const roots = [...labels.keys()].filter((key) => !parents.has(key));
  const levels: string[][] = [];
  const visited = new Set<string>();
  let current = roots.length ? roots : [edgePairs[0] ? nodeKey(edgePairs[0][0]) : 'start'];

  while (current.length) {
    const unique = [...new Set(current)].filter((key) => labels.has(key) && !visited.has(key));
    if (!unique.length) break;
    levels.push(unique);
    unique.forEach((key) => visited.add(key));
    current = unique.flatMap((key) => [...(children.get(key) ?? [])]);
  }

  const remaining = [...labels.keys()].filter((key) => !visited.has(key));
  if (remaining.length) levels.push(remaining);

  return [
    '<div class="markdown-flowchart" role="img" aria-label="Flowchart"><div class="markdown-flowchart-canvas">',
    ...levels.map((level, levelIndex) => `
      <div class="markdown-flowchart-level ${level.length > 1 ? 'is-branch' : ''}">
        ${level.map((key) => `<span class="markdown-flowchart-node"><small>Step ${[...labels.keys()].indexOf(key) + 1}</small>${labels.get(key) ?? key}</span>`).join('')}
      </div>
      ${levelIndex < levels.length - 1 ? '<div class="markdown-flowchart-connector" aria-hidden="true"></div>' : ''}
    `),
    '</div></div>'
  ].join('');
};

const isFlowchartBlock = (content: string) => {
  const firstLine = content.trimStart().split('\n')[0]?.trim().toLowerCase() ?? '';
  return firstLine.startsWith('flowchart') || firstLine.startsWith('graph');
};

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
  let tocMode = false;
  let tocIndex = 0;

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
        const code = codeBuffer.join('\n');
        html.push(isFlowchartBlock(code) ? renderFlowchart(code) : `<pre><code>${escapeHtml(code)}</code></pre>`);
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
      const label = heading[2];
      html.push(`<h${level} id="${slugify(label)}">${inlineMarkdown(label)}</h${level}>`);
      tocMode = slugify(label) === 'table-of-contents';
      tocIndex = tocMode ? 0 : tocIndex;
      index += 1;
      continue;
    }

    const listItem = /^\s*[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }

      if (tocMode) {
        tocIndex += 1;
        const cleanLabel = listItem[1].replace(/^\s*(?:#\s*)?\d+[.)]?\s*(?:#\s*)?/, '').trim();
        html.push(`<li class="markdown-toc-link"><span>${tocIndex}</span><a href="#${slugify(cleanLabel)}">${inlineMarkdown(cleanLabel)}</a></li>`);
      } else {
        html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
      }
      index += 1;
      continue;
    }

    closeList();
    if (tocMode && line.trim()) {
      tocIndex += 1;
      html.push(`<p class="markdown-toc-link"><span>${tocIndex}.</span><a href="#${slugify(line)}"># ${inlineMarkdown(line)}</a></p>`);
      index += 1;
      continue;
    }

    html.push(`<p>${inlineMarkdown(line)}</p>`);
    index += 1;
  }

  closeList();

  if (codeOpen) {
    const code = codeBuffer.join('\n');
    html.push(isFlowchartBlock(code) ? renderFlowchart(code) : `<pre><code>${escapeHtml(code)}</code></pre>`);
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
