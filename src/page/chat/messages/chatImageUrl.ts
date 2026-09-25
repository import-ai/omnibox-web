export function resolveChatImageUrl(
  src?: string,
  shareId?: string,
  chatOnly = false
): string | undefined {
  if (!src || chatOnly) return undefined;

  // Attachment URLs are complete, stable API paths supplied by the tools.
  // Rebind workspace history to the visitor's share; the API checks its scope.
  const attachment = src.match(
    /^\/api\/v1\/(?:namespaces|shares)\/[^/]+\/resources\/([^/]+)\/attachments\/([^/?#]+)$/
  );
  if (attachment) {
    return shareId
      ? `/api/v1/shares/${shareId}/resources/${attachment[1]}/attachments/${attachment[2]}`
      : src;
  }

  // Never resolve document-relative attachments against the conversation URL.
  if (src.startsWith('/api/') || !/^https?:\/\//i.test(src)) {
    return undefined;
  }
  return src;
}
