import { Fragment, type ReactNode } from 'react';

/** Renders **bold** segments within a single line of text as React nodes. */
export function renderInlineText(text: string): ReactNode[] {
  return renderInline(text);
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/**
 * Renders a small, safe subset of markdown that AI responses commonly use:
 * **bold**, "- " / "* " bullet lists, "1. " numbered lists, and blank-line
 * paragraph breaks. Deliberately not a full markdown parser — just enough
 * to make AI-generated summaries and questions readable instead of showing
 * literal asterisks and dashes.
 */
export function renderMarkdownLite(text: string): ReactNode {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>);
    blocks.push(
      listType === 'ol' ? (
        <ol key={blocks.length} className="list-decimal space-y-1 pl-5">{items}</ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">{items}</ul>
      )
    );
    listItems = [];
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)/);

    if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(numberedMatch[1]);
    } else {
      flushList();
      if (line) blocks.push(<p key={blocks.length}>{renderInline(line)}</p>);
    }
  }
  flushList();

  return <div className="space-y-2">{blocks}</div>;
}