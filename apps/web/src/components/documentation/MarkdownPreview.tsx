import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Share2, X } from 'lucide-react';
import './MarkdownPreview.css';

type MarkdownPreviewProps = {
  content: string;
  platformName?: string;
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

const renderFlowchart = (content: string) => `<div class="markdown-flowchart" role="img" aria-label="Flowchart"><div class="mermaid-source">${escapeHtml(content)}</div></div>`;

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

    const listItem = /^\s*(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
    if (listItem) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }

      if (tocMode) {
        tocIndex += 1;
        const linkedLabel = /^\[([^\]]+)\]\([^)]+\)$/.exec(listItem[1])?.[1] ?? listItem[1];
        const cleanLabel = linkedLabel.replace(/^(?:\s*#*\s*\d+[.)]?\s*)+/, '').replace(/^#+\s*/, '').trim();
        html.push(`<li class="markdown-toc-link"><span>${tocIndex}.</span><a href="#${slugify(cleanLabel)}">${inlineMarkdown(cleanLabel)}</a></li>`);
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

export function MarkdownPreview({ content, platformName = 'SK platform' }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  const rootRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const hasFlowchart = useMemo(() => html.includes('mermaid-source'), [html]);

  useEffect(() => {
    if (!rootRef.current || !hasFlowchart) return;
    let cancelled = false;
    void import('mermaid').then(async ({ default: mermaid }) => {
      if (cancelled || !rootRef.current) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        flowchart: { curve: 'basis', htmlLabels: true, useMaxWidth: true },
        themeVariables: { primaryColor: '#eeecff', primaryBorderColor: '#8b5cf6', primaryTextColor: '#111827', lineColor: '#374151', fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: '17px' }
      });
      const nodes = [...rootRef.current.querySelectorAll<HTMLElement>('.mermaid-source')];
      await Promise.all(nodes.map(async (node, index) => {
        const source = (node.textContent ?? '').replace(/→/g, '-->');
        try {
          const { svg } = await mermaid.render(`sk-flow-${Date.now()}-${index}`, source);
          if (!cancelled) node.innerHTML = svg;
        } catch {
          if (!cancelled) node.innerHTML = '<p class="markdown-flowchart-error">This flowchart could not be rendered. Check the Mermaid syntax in this Markdown file.</p>';
        }
      }));
    });
    return () => { cancelled = true; };
  }, [hasFlowchart, html]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  const shareDocumentation = async () => {
    const shareData = {
      title: `${platformName} documentation`,
      text: `Explore ${platformName} on the SK ecosystem—shared securely from SK Central.`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus('Shared');
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setShareStatus('Link copied');
      }
      window.setTimeout(() => setShareStatus(''), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Unable to share');
    }
  };

  return (
    <div className={expanded ? 'markdown-preview-expanded' : undefined}>
      {hasFlowchart ? <div className="markdown-preview-tools">
        {shareStatus ? <span role="status">{shareStatus}</span> : null}
        <button type="button" onClick={() => void shareDocumentation()} title="Share documentation"><Share2 size={16} /></button>
        <button type="button" onClick={() => setExpanded((value) => !value)} title={expanded ? 'Close expanded preview' : 'Expand preview'}>{expanded ? <X size={18} /> : <Maximize2 size={16} />}</button>
      </div> : null}
      <article ref={rootRef} className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}