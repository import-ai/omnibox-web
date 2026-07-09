interface TextSelectionLike {
  start: number;
  end: number;
}

export interface TextChange {
  start: number;
  end: number;
  delta: number;
}

export function normalizeSelection(
  selection: TextSelectionLike,
  length: number
) {
  const start = clamp(selection.start, 0, length);
  const end = clamp(selection.end, 0, length);
  return start <= end ? { start, end } : { start: end, end: start };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function getTextChange(
  previousText: string,
  nextText: string
): TextChange {
  let prefix = 0;
  while (
    prefix < previousText.length &&
    prefix < nextText.length &&
    previousText[prefix] === nextText[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix + prefix < previousText.length &&
    suffix + prefix < nextText.length &&
    previousText[previousText.length - 1 - suffix] ===
      nextText[nextText.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const end = previousText.length - suffix;
  const insertedLength = nextText.length - prefix - suffix;
  return {
    start: prefix,
    end,
    delta: insertedLength - (end - prefix),
  };
}
