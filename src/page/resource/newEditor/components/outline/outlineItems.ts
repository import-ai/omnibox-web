export interface OutlineItem {
  id: string;
  level: number;
  line?: number;
  pos?: number;
  text: string;
}

interface OutlineNode {
  attrs?: {
    level?: number;
  };
  content?: {
    size: number;
  };
  textBetween?: (from: number, to: number, separator?: string) => string;
  textContent?: string;
  type: {
    name: string;
  };
}

interface OutlineDoc {
  descendants: (callback: (node: OutlineNode, pos: number) => void) => void;
}

function cleanHeadingText(text: string) {
  return text.replace(/\s+#+\s*$/, '').trim();
}

function getNodeText(node: OutlineNode) {
  if (node.textBetween && node.content) {
    return node.textBetween(0, node.content.size, ' ');
  }

  return node.textContent ?? '';
}

export function getOutlineItemsFromDoc(doc: OutlineDoc): OutlineItem[] {
  const items: OutlineItem[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') {
      return;
    }

    const text = cleanHeadingText(getNodeText(node));

    if (!text) {
      return;
    }

    items.push({
      id: `heading-${items.length}-${pos}`,
      level: node.attrs?.level ?? 1,
      pos,
      text,
    });
  });

  return items;
}

export function getOutlineItemsFromMarkdown(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  let fenced = false;

  markdown.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return;
    }

    if (fenced) {
      return;
    }

    const match = /^(#{1,6})\s+(.+)$/.exec(line);

    if (!match) {
      return;
    }

    const text = cleanHeadingText(match[2]);

    if (!text) {
      return;
    }

    items.push({
      id: `source-heading-${items.length}-${index + 1}`,
      level: match[1].length,
      line: index + 1,
      text,
    });
  });

  return items;
}
