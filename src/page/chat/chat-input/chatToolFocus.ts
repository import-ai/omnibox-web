/** Prevents Radix from automatically focusing the first resource row control. */
export function focusResourceDialogOnOpen(
  event: Event,
  dialog: HTMLDivElement | null,
  openedByPointer: boolean
) {
  if (!openedByPointer) return;
  event.preventDefault();
  dialog?.focus({ preventScroll: true });
}
