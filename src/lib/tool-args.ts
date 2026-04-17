import { TFunction } from 'i18next';

export function pathI18n(path: string, t: TFunction): string {
  for (const key of ['private', 'teamspace']) {
    if (path.startsWith('/' + key)) {
      return (
        '/' +
        t(`chat.messages.tool_calls.function_args.${key}`) +
        path.slice(key.length + 1)
      );
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

function convertToString(arg: any): string {
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      // pass
    }
  }
  return `${arg}`;
}

export function processArgs(
  args: Record<string, unknown>,
  t: TFunction
): string[] {
  return Object.values(args).map(v =>
    trimMiddle(pathI18n(convertToString(v), t))
  );
}

export function joinArgs(args: string[]): string {
  return args.map(arg => `"${arg}"`).join(' ');
}
