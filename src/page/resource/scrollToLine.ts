export function parseScrollToLine(value: string | null): number | undefined {
  const match = value?.match(/^#?L(\d+)$/);
  if (!match) return undefined;

  const lineNumber = Number(match[1]);
  return Number.isSafeInteger(lineNumber) && lineNumber > 0
    ? lineNumber
    : undefined;
}
