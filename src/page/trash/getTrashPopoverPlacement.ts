export const TRASH_POPOVER_WIDTH_PX = 320;
export const TRASH_POPOVER_GAP_PX = 8;

export type TrashPopoverSide = 'right' | 'left' | 'bottom';

export type TrashPopoverPlacement = {
  align: 'start';
  side: TrashPopoverSide;
};

export function getTrashPopoverPlacement({
  gap = TRASH_POPOVER_GAP_PX,
  menuWidth = TRASH_POPOVER_WIDTH_PX,
  triggerLeft,
  triggerRight,
  viewportWidth,
}: {
  gap?: number;
  menuWidth?: number;
  triggerLeft: number;
  triggerRight: number;
  viewportWidth: number;
}): TrashPopoverPlacement {
  const spaceRight = viewportWidth - triggerRight - gap;
  const spaceLeft = triggerLeft - gap;

  if (spaceRight >= menuWidth) {
    return { align: 'start', side: 'right' };
  }
  if (spaceLeft >= menuWidth) {
    return { align: 'start', side: 'left' };
  }
  return { align: 'start', side: 'bottom' };
}
