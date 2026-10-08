export function resolveChatImageUrl(
  src?: string,
  shareId?: string
): string | undefined {
  if (!src) return undefined;
  // Document-relative attachments must not resolve against the conversation.
  if (/^(?:\.\/)?attachments\//i.test(src)) return undefined;

  let url: URL;
  try {
    url = new URL(src, window.location.origin);
  } catch {
    return undefined;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return undefined;
  if (url.origin !== window.location.origin) return src;

  // Rebind workspace history to the visitor's share; the API checks its scope.
  const attachment = url.pathname.match(
    /^\/api\/v1\/(?:namespaces|shares)\/[\w-]+\/resources\/([\w-]+)\/attachments\/([\w.-]+)$/
  );
  if (attachment) {
    return shareId
      ? `/api/v1/shares/${shareId}/resources/${attachment[1]}/attachments/${attachment[2]}`
      : src;
  }
  return url.pathname.startsWith('/api/') ? undefined : src;
}
