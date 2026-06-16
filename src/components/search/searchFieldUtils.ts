export function shouldShowSearchFieldClear(
  value: string,
  enabled = true
): boolean {
  return enabled && value.length > 0;
}

export function getSearchFieldDebounceDelay(debounceMs = 0): number {
  if (!Number.isFinite(debounceMs) || debounceMs <= 0) {
    return 0;
  }

  return debounceMs;
}
