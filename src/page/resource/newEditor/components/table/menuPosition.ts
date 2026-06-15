import type { MouseEvent } from 'react';

import type { MenuPosition } from './types';

const menuMargin = 8;
const menuWidth = 128;
const submenuWidth = 144;
const menuHeight = 168;

export function isTableCellTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('td, th'));
}

export function getTableMenuPosition(
  event: MouseEvent<HTMLDivElement>
): MenuPosition {
  return {
    x: Math.max(
      menuMargin,
      Math.min(
        event.clientX,
        window.innerWidth - menuWidth - submenuWidth - menuMargin
      )
    ),
    y: Math.max(
      menuMargin,
      Math.min(event.clientY, window.innerHeight - menuHeight - menuMargin)
    ),
  };
}
