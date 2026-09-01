export type ManualDropPosition = 'before' | 'inside' | 'after';

export const RESOURCE_TREE_INDENT = 20;
export const RESOURCE_TREE_ICON_OFFSET = 28;

export interface ManualDropLine {
  left: number;
  top: number;
  width: number;
  arrowOffset: number;
  guideCount: number;
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
  guideCount: number;
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

interface DropBoundary {
  targetId: string;
  position: 'before' | 'after';
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

export function getDragAwareDropBoundary(
  items: VisibleDropItem[],
  targetId: string,
  position: 'before' | 'after',
  dragId: string
): DropBoundary {
  const targetIndex = items.findIndex(item => item.id === targetId);
  const boundaryIndex = targetIndex + (position === 'after' ? 1 : 0);
  if (targetIndex >= 0 && items[boundaryIndex]?.id === dragId) {
    return { targetId: dragId, position: 'after' };
  }
  return { targetId, position };
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
  const minimumDepth = next?.depth ?? 0;
  const maximumDepth = Math.max(previous?.depth ?? 0, next?.depth ?? 0);
  const depth = Math.min(maximumDepth, Math.max(minimumDepth, projectedDepth));

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

export function getHierarchyGuideCount(
  items: VisibleDropItem[],
  targetId: string,
  targetDepth: number,
  boundary: 'before' | 'after'
) {
  if (items.length === 0) return 0;

  const topLevelDepth = Math.min(...items.map(item => item.depth));
  if (targetDepth <= topLevelDepth) return 0;

  const targetIndex = items.findIndex(item => item.id === targetId);
  if (targetIndex < 0) return 0;

  const boundaryIndex = targetIndex + (boundary === 'after' ? 1 : 0);
  const previous = items[boundaryIndex - 1];
  const nextDepth = items[boundaryIndex]?.depth ?? topLevelDepth;
  if (
    !previous ||
    previous.depth <= nextDepth ||
    targetDepth > previous.depth
  ) {
    return 0;
  }
  return Math.max(0, targetDepth - nextDepth);
}

export function getManualDropLine({
  position,
  rowRect,
  depth,
  guideCount,
}: GetManualDropLineOptions): ManualDropLine {
  const arrowOffset = RESOURCE_TREE_ICON_OFFSET + depth * RESOURCE_TREE_INDENT;

  return {
    left: rowRect.left,
    top: position === 'before' ? rowRect.top : rowRect.bottom,
    width: rowRect.width,
    arrowOffset,
    guideCount: Math.min(depth, Math.max(0, guideCount)),
  };
}
