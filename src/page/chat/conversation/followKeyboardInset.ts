export function nextStickToBottomScrollTop(
  scrollTop: number,
  contentHeightDelta: number
): number {
  if (contentHeightDelta === 0) {
    return Math.max(0, scrollTop);
  }
  return Math.max(0, scrollTop + contentHeightDelta);
}

/** When the list viewport shrinks (keyboard), keep the last actions in view. */
export function nextStickToBottomViewportScrollTop(
  scrollHeight: number,
  clientHeight: number
): number {
  return Math.max(0, scrollHeight - clientHeight);
}
