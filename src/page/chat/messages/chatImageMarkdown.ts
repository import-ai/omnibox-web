import { fromMarkdown } from 'mdast-util-from-markdown';

type MarkdownNode = {
  type: string;
  identifier?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

/** Remove image syntax and its reference definitions from chat-only copies. */
export function withoutMarkdownImages(content: string): string {
  const images: MarkdownNode[] = [];
  const definitions: MarkdownNode[] = [];
  const visit = (node: MarkdownNode) => {
    if (node.type === 'image' || node.type === 'imageReference')
      images.push(node);
    if (node.type === 'definition') definitions.push(node);
    node.children?.forEach(visit);
  };
  visit(fromMarkdown(content));
  const identifiers = new Set(images.map(node => node.identifier));
  const removed = [
    ...images,
    ...definitions.filter(node => identifiers.has(node.identifier)),
  ];
  for (const node of removed.sort(
    (a, b) => (b.position?.start.offset ?? 0) - (a.position?.start.offset ?? 0)
  )) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      content = content.slice(0, start) + content.slice(end);
    }
  }
  return content;
}
