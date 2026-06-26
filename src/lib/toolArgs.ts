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

export interface ProcessedArg {
  key: string;
  display: string;
  // Set when this argument is a resource id (resource_id / parent_id /
  // new_parent_id), so the UI can render the resource name as a clickable link.
  resourceId?: string;
}

const RESOURCE_ID_ARG_KEYS = new Set([
  'resource_id',
  'parent_id',
  'new_parent_id',
]);

export function processArgs(
  args: Record<string, unknown>,
  t: TFunction
): ProcessedArg[] {
  return Object.entries(args).map(([key, v]) => {
    if (RESOURCE_ID_ARG_KEYS.has(key) && typeof v === 'string' && v) {
      return { key, display: trimMiddle(v), resourceId: v };
    }
    return { key, display: trimMiddle(pathI18n(convertToString(v), t)) };
  });
}

export function joinArgs(args: ProcessedArg[]): string {
  return args.map(arg => `"${arg.display}"`).join(' ');
}
