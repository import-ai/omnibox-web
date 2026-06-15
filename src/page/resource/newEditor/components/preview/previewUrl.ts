export function resolvePreviewUrl(src: unknown, linkBase = '') {
  if (typeof src !== 'string' || !src) {
    return src;
  }

  if (!linkBase || src.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(src)) {
    return src;
  }

  return `${linkBase}${src}`;
}
