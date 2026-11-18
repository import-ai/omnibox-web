export interface ImageViewerSize {
  width: number;
  height: number;
}

type Point = { x: number; y: number };

export function isLongImage(size: ImageViewerSize) {
  return size.width > 0 && size.height >= size.width * 3;
}

export function getImageViewerLayout(
  size: ImageViewerSize,
  viewport: ImageViewerSize & { dialogHeight?: number },
  turn: number,
  zoom: number | null
) {
  const sideways = turn % 2 === 1;
  const natural = sideways ? { width: size.height, height: size.width } : size;
  const availableWidth = Math.min(960, viewport.width * 0.9);
  const dialogHeight = viewport.dialogHeight ?? viewport.height;
  const long = !sideways && isLongImage(size);
  const fit = Math.min(
    1,
    availableWidth / natural.width,
    long
      ? Infinity
      : Math.min(dialogHeight * 0.85, viewport.height) / natural.height
  );
  const scale = zoom ?? fit;
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    fit,
    scale,
    width,
    height,
    imageWidth: size.width * scale,
    imageHeight: size.height * scale,
    x: Math.max(0, (viewport.width - width) / 2),
    y:
      long && zoom === null
        ? 0
        : Math.max(
            0,
            Math.min((dialogHeight - height) / 2, viewport.height - height)
          ),
    widthWithGutter: Math.max(width, viewport.width),
    heightWithGutter: Math.max(height, viewport.height),
    long,
  };
}

export function rotateImagePoint({ x, y }: Point, quarterTurns: number): Point {
  switch (((quarterTurns % 4) + 4) % 4) {
    case 1:
      return { x: 1 - y, y: x };
    case 2:
      return { x: 1 - x, y: 1 - y };
    case 3:
      return { x: y, y: 1 - x };
    default:
      return { x, y };
  }
}

const ZOOM_LEVELS = [
  0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4,
] as const;

export function stepImageViewerZoom(
  current: number,
  fit: number,
  direction: -1 | 1
): number | null {
  const minimum = Math.min(fit, ZOOM_LEVELS[0]);
  const tolerance = current * 1e-10;
  if (direction === 1)
    return ZOOM_LEVELS.find(level => level > current + tolerance) ?? null;
  for (let index = ZOOM_LEVELS.length - 1; index >= 0; index--) {
    const level = ZOOM_LEVELS[index];
    if (level < current - tolerance) return level;
  }
  return minimum < current - tolerance ? minimum : null;
}
