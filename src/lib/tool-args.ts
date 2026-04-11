export function pathI18n(
  path: string,
  mapping: { private: string; teamspace: string }
): string {
  for (const [key, value] of Object.entries(mapping)) {
    if (path.startsWith('/' + key)) {
      return '/' + value + path.slice(key.length + 1);
    }
  }
  return path;
}

export function trimMiddle(str: string, maxLength: number = 20): string {
  if (str.length <= maxLength) return str;

  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;

  const front = Math.ceil(charsToShow / 2);
  const back = Math.floor(charsToShow / 2);

  const trimmed = str.slice(0, front) + ellipsis + str.slice(str.length - back);
  return trimmed.replaceAll('\n', ' ');
}

export function parseArgs(
  args: Record<string, unknown>,
  mapping: { private: string; teamspace: string }
): string {
  return Object.values(args)
    .map(v => {
      const vStr = `${v}`;
      const processedV = trimMiddle(pathI18n(vStr, mapping));
      return `"${processedV}"`;
    })
    .join(' ');
}
