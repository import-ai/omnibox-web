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

export const searchFieldClearButtonClassName =
  'h-[22px] rounded border-none bg-transparent px-2 text-sm font-normal text-muted-foreground shadow-none outline-none ring-0 hover:bg-accent hover:text-muted-foreground focus-visible:ring-0 focus-visible:ring-transparent active:!bg-[#3b82f633] active:text-[#3b82f6] dark:hover:bg-accent';
