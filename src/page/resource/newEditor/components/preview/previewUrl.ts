export function resolvePreviewUrl<T>(
  src: T,
  linkBase = ''
): T extends string ? string : T {
  if (typeof src !== 'string' || !src) {
    return src as T extends string ? string : T;
  }

  if (!linkBase || src.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(src)) {
    return src as T extends string ? string : T;
  }

  return `${linkBase.replace(/\/$/, '')}/${src.replace(/^\.\//, '')}` as T extends string
    ? string
    : T;
}
