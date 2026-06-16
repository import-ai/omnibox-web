const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;
const DEFAULT_MENU_WIDTH = 256;
const DEFAULT_MENU_HEIGHT = 320;

interface AnchorRect {
  bottom: number;
  left: number;
  top: number;
}

interface MenuSize {
  height: number;
  width: number;
}

interface ViewportSize {
  height: number;
  width: number;
}

export interface SlashCommandMenuPosition {
  left: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
  top: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getSlashCommandMenuPosition(
  anchorRect: AnchorRect,
  menuSize: MenuSize,
  viewportSize: ViewportSize
): SlashCommandMenuPosition {
  const menuWidth = menuSize.width || DEFAULT_MENU_WIDTH;
  const menuHeight = menuSize.height || DEFAULT_MENU_HEIGHT;
  const spaceBelow =
    viewportSize.height - anchorRect.bottom - MENU_GAP - VIEWPORT_MARGIN;
  const spaceAbove = anchorRect.top - MENU_GAP - VIEWPORT_MARGIN;
  const placeAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const availableHeight = Math.max(0, placeAbove ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(DEFAULT_MENU_HEIGHT, availableHeight);
  const visibleHeight = Math.min(menuHeight, maxHeight);
  const maxLeft = Math.max(
    VIEWPORT_MARGIN,
    viewportSize.width - menuWidth - VIEWPORT_MARGIN
  );
  const left = clamp(anchorRect.left, VIEWPORT_MARGIN, maxLeft);
  const top = placeAbove
    ? Math.max(VIEWPORT_MARGIN, anchorRect.top - MENU_GAP - visibleHeight)
    : Math.min(
        anchorRect.bottom + MENU_GAP,
        viewportSize.height - VIEWPORT_MARGIN
      );

  return {
    left,
    maxHeight,
    placement: placeAbove ? 'top' : 'bottom',
    top,
  };
}
