const DESIGN_BOTTOM = 47.5148;
const DESIGN_RIGHT = 161.12;
const BOTTOM_INSET = 48.0555 - DESIGN_BOTTOM;

function format(value: number) {
  return Number(value.toFixed(3)).toString();
}

/**
 * Speech bubble from the Figma outline. Corner curves and the left tail keep
 * their design size; only the straight top, bottom, and side edges stretch.
 */
export function speechBubblePath(width: number, height: number) {
  const right = width - (161.62 - DESIGN_RIGHT);
  const bottom = height - BOTTOM_INSET;
  const deltaY = bottom - DESIGN_BOTTOM;
  const y = (designY: number) => designY + deltaY;
  const shiftX = right - DESIGN_RIGHT;

  return [
    `M31.355 0.5`,
    `L${format(137.872 + shiftX)} 0.545`,
    `C${format(150.712 + shiftX)} 0.551 ${format(161.119 + shiftX)} 10.962 ${format(right)} 23.803`,
    `L${format(right)} ${format(23.803 + deltaY)}`,
    `C${format(right)} ${format(y(36.591))} ${format(150.795 + shiftX)} ${format(y(46.981))} ${format(138.006 + shiftX)} ${format(y(47.061))}`,
    `L3.989 ${format(bottom)}`,
    `C1.314 ${format(y(47.524))} -0.364 ${format(y(44.634))} 0.967 ${format(y(42.317))}`,
    `L4.066 ${format(y(36.925))}`,
    `C4.796 ${format(y(35.654))} 5.165 ${format(y(34.208))} 5.134 ${format(y(32.742))}`,
    `L5.022 ${format(y(27.382))}`,
    `L5.022 27.382`,
    `C4.711 12.624 16.593 0.494 31.355 0.5`,
    'Z',
  ].join('');
}
