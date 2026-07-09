interface RepairableRange {
  start: number;
  end: number;
}

interface ClaimedToolRange<Tool extends string> extends RepairableRange {
  tool: Tool;
  label: string;
}

/**
 * Claim token text that already exists in the composer but lost its metadata range.
 */
export function claimExistingTokenText<Tool extends string>(
  text: string,
  ranges: RepairableRange[],
  tool: Tool,
  label: string,
  tokenText: string
): ClaimedToolRange<Tool> | null {
  let start = text.indexOf(tokenText);

  while (start >= 0) {
    const end = start + tokenText.length;
    const overlaps = ranges.some(
      range => start < range.end && end > range.start
    );
    if (!overlaps) return { tool, label, start, end };
    start = text.indexOf(tokenText, start + tokenText.length);
  }

  return null;
}
