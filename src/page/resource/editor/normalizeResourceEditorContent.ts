import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

export function normalizeResourceEditorContent(
  node: TiptapJsonContent
): TiptapJsonContent {
  // Legacy Markdown can produce empty quotes, but the schema requires block+.
  // UniqueID validates their content before onReady can restore comment anchors.
  if (node.type === 'blockquote' && !node.content?.length) {
    return { ...node, content: [{ type: 'paragraph' }] };
  }
  if (!node.content) return node;
  const content = node.content.map(normalizeResourceEditorContent);
  return content.some((child, index) => child !== node.content?.[index])
    ? { ...node, content }
    : node;
}
