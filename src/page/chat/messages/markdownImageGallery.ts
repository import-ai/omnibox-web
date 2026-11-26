import type { ExtraProps } from 'react-markdown';

type MarkdownElement = NonNullable<ExtraProps['node']>;
type MarkdownRoot = { children: readonly { type: string }[] };

const galleries = new WeakMap<
  MarkdownElement,
  { index: number; images: MarkdownElement[] }
>();

export function markdownImageGallery() {
  return (root: MarkdownRoot) => {
    const images: MarkdownElement[] = [];
    const visit = (node: { type: string }) => {
      if (node.type !== 'element') return;
      const element = node as MarkdownElement;
      if (element.tagName === 'img') {
        galleries.set(element, { index: images.length, images });
        images.push(element);
      }
      element.children.forEach(visit);
    };
    root.children.forEach(visit);
  };
}

export function getMarkdownImageGallery(node: ExtraProps['node']) {
  return node && galleries.get(node);
}
