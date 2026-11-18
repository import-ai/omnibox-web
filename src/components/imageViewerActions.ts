export type ImageViewerDownload =
  { href: string; name: string } | { run: () => Promise<void> };

/** The caller must opt in with a readable original, never a share or thumbnail URL. */
export function originalImageDownload(
  source: string,
  name?: string
): ImageViewerDownload | undefined {
  try {
    const url = new URL(source, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    const filename =
      name || decodeURIComponent(url.pathname.split('/').pop() || 'image');
    return { href: url.href, name: filename.replace(/[/\\]/g, '_') };
  } catch {
    return undefined;
  }
}

export function externalImageLink(source: string): string | undefined {
  try {
    const url = new URL(source);
    if (
      url.origin !== window.location.origin &&
      /^https?:$/.test(url.protocol) &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    // Relative and invalid URLs are not external originals.
  }
  return undefined;
}
