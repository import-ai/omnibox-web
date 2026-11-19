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
