export type ManualDropPosition = 'before' | 'inside' | 'after';

export const RESOURCE_TREE_INDENT = 20;

export interface ManualDropLine {
  left: number;
  top: number;
  width: number;
  arrowOffset: number;
  guideOffset: number | null;
}

interface DropIndicatorRect {
  left: number;
  top: number;
  bottom: number;
  width: number;
}

interface GetManualDropLineOptions {
  position: ManualDropPosition;
  rowRect: DropIndicatorRect;
  depth: number;
}

export interface VisibleDropItem {
  id: string;
  depth: number;
}

export interface ManualDropTarget {
  targetId: string;
  position: ManualDropPosition;
  depth: number;
}

export function getProjectedDropDepth(
  sourceDepth: number,
  horizontalOffset: number
) {
  return Math.max(
    0,
    sourceDepth + Math.round(horizontalOffset / RESOURCE_TREE_INDENT)
  );
}

export function resolveBoundaryDropTarget(
  items: VisibleDropItem[],
  targetId: string,
  projectedDepth: number,
  boundary: 'before' | 'after'
): ManualDropTarget {
  const targetIndex = items.findIndex(item => item.id === targetId);
  if (targetIndex < 0) {
    return { targetId, position: boundary, depth: 0 };
  }

  const boundaryIndex = targetIndex + (boundary === 'after' ? 1 : 0);
  const previous = items[boundaryIndex - 1];
  const next = items[boundaryIndex];
  const maximumDepth = Math.max(previous?.depth ?? 0, next?.depth ?? 0);
  const depth = Math.min(maximumDepth, Math.max(0, projectedDepth));

  // Map a visual boundary in the flattened tree back to the relative target
  // expected by the manual-sort API at the projected depth.
  for (let index = boundaryIndex; index < items.length; index += 1) {
    if (items[index].depth < depth) {
      break;
    }
    if (items[index].depth === depth) {
      return { targetId: items[index].id, position: 'before', depth };
    }
  }

  for (let index = boundaryIndex - 1; index >= 0; index -= 1) {
    if (items[index].depth === depth) {
      return { targetId: items[index].id, position: 'after', depth };
    }
    if (items[index].depth === depth - 1) {
      return { targetId: items[index].id, position: 'inside', depth };
    }
    if (items[index].depth < depth) {
      break;
    }
  }

  return { targetId, position: boundary, depth };
}

export function getManualDropLine({
  position,
  rowRect,
  depth,
}: GetManualDropLineOptions): ManualDropLine {
  const arrowOffset = depth * RESOURCE_TREE_INDENT;
  const guideOffset = depth > 0 ? (depth - 1) * RESOURCE_TREE_INDENT : null;

  return {
    left: rowRect.left,
    top: position === 'before' ? rowRect.top : rowRect.bottom,
    width: rowRect.width,
    arrowOffset,
    guideOffset,
  };
}
