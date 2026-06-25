import { contentToMarkdown, type TiptapJsonContent } from 'cvnert-editor';

function isTiptapDocContent(value: unknown): value is TiptapJsonContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc' &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

export function getMarkdownDownloadContent(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) {
    return content;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (isTiptapDocContent(parsed)) {
      return contentToMarkdown(parsed, { debug: false });
    }
  } catch {
    return content;
  }

  return content;
}
