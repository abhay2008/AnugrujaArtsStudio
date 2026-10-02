import React from 'react';

export function inlineMarkdown(text: string): React.ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^\s)]+\))/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{inlineMarkdown(part.slice(2, -2))}</strong>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && (/^\/(?!\/)/.test(link[2]) || /^https:\/\//i.test(link[2]))) {
      return <a key={i} href={link[2]} {...(link[2].startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{link[1]}</a>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function renderRich(text: string): React.ReactNode {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('```')) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i]);
      blocks.push(<pre key={i}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const match = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (match) {
      const ordered = /^\d/.test(match[1]);
      const items: React.ReactNode[] = [];
      let j = i;
      while (j < lines.length) {
        const next = lines[j].trim().match(/^([-*•]|\d+[.)])\s+(.*)$/);
        if (!next || /^\d/.test(next[1]) !== ordered) break;
        items.push(<li key={j}>{inlineMarkdown(next[2])}</li>);
        j++;
      }
      blocks.push(ordered ? <ol key={i} start={parseInt(match[1], 10)}>{items}</ol> : <ul key={i}>{items}</ul>);
      i = j - 1;
    } else if (line.startsWith('> ')) {
      blocks.push(<blockquote key={i}>{inlineMarkdown(line.slice(2))}</blockquote>);
    } else {
      blocks.push(<p key={i}>{inlineMarkdown(line)}</p>);
    }
  }
  return <>{blocks}</>;
}
