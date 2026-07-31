/** Whether title caret should leave for the body editor. */
export function shouldNavigateTitleToBody(
  event: {
    key: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    nativeEvent: { isComposing: boolean };
  },
  selection: { start: number; end: number; length: number }
): boolean {
  if (
    event.nativeEvent.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false;
  }

  const collapsed = selection.start === selection.end;

  if (event.key === 'Enter') {
    return true;
  }

  if (!collapsed) {
    return false;
  }

  if (event.key === 'ArrowDown') {
    return true;
  }

  if (event.key === 'ArrowRight' && selection.start === selection.length) {
    return true;
  }

  return false;
}
