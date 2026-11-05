import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

/** Stable, editor-runtime-independent representation of a document. */
export type ComparableDocument = string;

interface JsonMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  marks?: JsonMark[];
  text?: string;
  content?: JsonNode[];
}

interface ComparableNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: ComparableNode[];
  text?: string;
  content?: ComparableNode[];
}

const RUNTIME_NODE_ATTRS = new Set(['id', 'data-toc-id']);
const RESOURCE_COMMENT_MARK = 'resourceComment';
const LINK_MARK_ATTRS = new Set(['href', 'title']);

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) {
      normalized[key] = normalizeJsonValue(child);
    }
  }
  return normalized;
}

function canonicalizeNodeAttrs(
  nodeType: string,
  attrs?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!attrs) {
    return undefined;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (nodeType === 'mention') {
      if (key === 'id' && value !== undefined && value !== null) {
        normalized.id = normalizeJsonValue(value);
      }
      continue;
    }

    if (RUNTIME_NODE_ATTRS.has(key) || value === undefined || value === null) {
      continue;
    }
    if (key === 'indent' && value === 0) {
      continue;
    }
    if (key === 'frontMatter' && value === false) {
      continue;
    }

    normalized[key] = normalizeJsonValue(value);
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function canonicalizeMarkAttrs(
  markType: string,
  attrs?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!attrs) {
    return undefined;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (markType === 'link' && !LINK_MARK_ATTRS.has(key)) {
      continue;
    }
    if (value !== undefined && value !== null) {
      normalized[key] = normalizeJsonValue(value);
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function canonicalizeMark(mark: JsonMark): ComparableNode | null {
  if (!mark.type || mark.type === RESOURCE_COMMENT_MARK) {
    return null;
  }

  const attrs = canonicalizeMarkAttrs(mark.type, mark.attrs);
  return attrs ? { type: mark.type, attrs } : { type: mark.type };
}

function mergeAdjacentTextNodes(content: ComparableNode[]) {
  const merged: ComparableNode[] = [];
  for (const node of content) {
    const previous = merged.at(-1);
    if (
      node.type === 'text' &&
      previous?.type === 'text' &&
      node.text !== undefined &&
      previous.text !== undefined &&
      stableStringify(node.marks ?? []) ===
        stableStringify(previous.marks ?? [])
    ) {
      previous.text += node.text;
      continue;
    }
    merged.push(node);
  }
  return merged;
}

function canonicalizeNode(node: JsonNode): ComparableNode | null {
  if (node.type === 'imageUpload') {
    return null;
  }

  const type = node.type ?? '';
  const attrs = canonicalizeNodeAttrs(type, node.attrs);
  const marks = node.marks
    ?.map(canonicalizeMark)
    .filter((mark): mark is ComparableNode => mark !== null)
    .sort((left, right) =>
      stableStringify(left).localeCompare(stableStringify(right))
    );
  const canonicalChildren = node.content
    ?.map(canonicalizeNode)
    .filter((child): child is ComparableNode => child !== null);
  const content = canonicalChildren
    ? mergeAdjacentTextNodes(canonicalChildren)
    : undefined;

  const canonical: ComparableNode = { type };
  if (attrs) canonical.attrs = attrs;
  if (marks?.length) canonical.marks = marks;
  if (typeof node.text === 'string') canonical.text = node.text;
  if (content?.length) canonical.content = content;
  return canonical;
}

function isEmptyParagraph(node: ComparableNode) {
  return (
    node.type === 'paragraph' &&
    !node.attrs &&
    !node.marks &&
    node.text === undefined &&
    !node.content
  );
}

function isEditorTerminalParagraph(content: ComparableNode[]) {
  const last = content.at(-1);
  if (!last || !isEmptyParagraph(last)) {
    return false;
  }
  const previous = content.at(-2);
  return !previous || previous.type !== 'paragraph';
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

/**
 * Removes editor-runtime data that is recreated on every mount while keeping
 * all user-editable document content and properties.
 */
export function toComparableDocument(
  json: TiptapJsonContent
): ComparableDocument {
  const document = canonicalizeNode(json as JsonNode);
  if (!document) {
    return stableStringify({ type: 'doc' });
  }

  // The editor appends one empty paragraph after block content so users can
  // continue typing. A blank paragraph after normal text is user-authored.
  if (document.content?.length && isEditorTerminalParagraph(document.content)) {
    document.content.pop();
  }
  if (document.content && document.content.length === 0) {
    delete document.content;
  }

  return stableStringify(document);
}

export function isDocumentChanged(
  baseline: ComparableDocument,
  current: TiptapJsonContent
): boolean {
  return baseline !== toComparableDocument(current);
}
