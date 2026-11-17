import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

const SHARE_API_ATTACHMENT_RE =
  /^\/api\/v1\/shares\/([^/]+)\/resources\/([^/]+)\/attachments\/([^/]+)$/;
const NAMESPACE_API_ATTACHMENT_RE =
  /^\/api\/v1\/namespaces\/([^/]+)\/resources\/([^/]+)\/attachments\/([^/]+)$/;
const SHARE_PAGE_ATTACHMENT_RE =
  /^\/s\/([^/]+)\/([^/]+)\/attachments\/([^/]+)$/;
const NAMESPACE_PAGE_ATTACHMENT_RE =
  /^\/([^/]+)\/([^/]+)\/attachments\/([^/]+)$/;
const RELATIVE_ATTACHMENT_RE = /^(?:\.\/)?attachments\/([^/?#]+)([?#].*)?$/;

interface AttachmentTarget {
  resourceId: string;
  attachmentId: string;
}

function attachmentTarget(pathname: string): AttachmentTarget | undefined {
  const shareApi = pathname.match(SHARE_API_ATTACHMENT_RE);
  if (shareApi) {
    return { resourceId: shareApi[2], attachmentId: shareApi[3] };
  }

  const namespaceApi = pathname.match(NAMESPACE_API_ATTACHMENT_RE);
  if (namespaceApi) {
    return { resourceId: namespaceApi[2], attachmentId: namespaceApi[3] };
  }

  const sharePage = pathname.match(SHARE_PAGE_ATTACHMENT_RE);
  if (sharePage) {
    return { resourceId: sharePage[2], attachmentId: sharePage[3] };
  }

  const namespacePage = pathname.match(NAMESPACE_PAGE_ATTACHMENT_RE);
  if (namespacePage) {
    return { resourceId: namespacePage[2], attachmentId: namespacePage[3] };
  }

  return undefined;
}

/**
 * Rebind an attachment URL to the active share before the browser requests it.
 * The backend validates both the share and the resource scope on this route.
 */
export function resolveShareAttachmentUrl(
  src: string | undefined,
  shareId: string | undefined,
  resourceId?: string
): string | undefined {
  if (!src || !shareId) return src;

  const relative = src.match(RELATIVE_ATTACHMENT_RE);
  if (relative && resourceId) {
    return `/api/v1/shares/${shareId}/resources/${resourceId}/attachments/${relative[1]}${relative[2] ?? ''}`;
  }

  const origin =
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  let url: URL;
  try {
    url = new URL(src, origin);
  } catch {
    return src;
  }
  if (url.origin !== origin) return src;

  const target = attachmentTarget(url.pathname);
  if (!target) return src;

  return `/api/v1/shares/${shareId}/resources/${target.resourceId}/attachments/${target.attachmentId}${url.search}${url.hash}`;
}

interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  marks?: JsonNode[];
}

function rewriteNode(
  node: JsonNode,
  shareId: string,
  resourceId?: string
): void {
  if (node.type === 'image' && node.attrs) {
    const src = node.attrs.src;
    if (typeof src === 'string') {
      node.attrs.src =
        resolveShareAttachmentUrl(src, shareId, resourceId) ?? src;
    }
  }

  if (node.marks) {
    for (const mark of node.marks) {
      if (mark.type !== 'link' || !mark.attrs) continue;
      const href = mark.attrs.href;
      if (typeof href === 'string') {
        mark.attrs.href =
          resolveShareAttachmentUrl(href, shareId, resourceId) ?? href;
      }
    }
  }

  if (node.content) {
    for (const child of node.content) {
      rewriteNode(child, shareId, resourceId);
    }
  }
}

/** Rewrite attachment image and link destinations in parsed editor content. */
export function rewriteShareAttachmentUrls(
  content: TiptapJsonContent,
  shareId: string,
  resourceId?: string
): TiptapJsonContent {
  rewriteNode(content as JsonNode, shareId, resourceId);
  return content;
}
