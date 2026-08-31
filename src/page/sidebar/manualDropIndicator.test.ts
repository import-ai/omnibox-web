import {
  getDragAwareDropBoundary,
  getHierarchyGuideCount,
  getManualDropLine,
  getProjectedDropDepth,
  resolveBoundaryDropTarget,
} from './manualDropIndicator';

const rowRect = { left: 72, top: 80, bottom: 112, width: 240 };

it('keeps the indicator on the hovered row boundary', () => {
  expect(
    getManualDropLine({
      position: 'inside',
      rowRect,
      depth: 2,
      guideCount: 0,
    })
  ).toEqual({
    left: 72,
    top: 112,
    width: 240,
    arrowOffset: 40,
    guideCount: 0,
  });
});

it('keeps sibling indicators at the target level', () => {
  expect(
    getManualDropLine({
      position: 'before',
      rowRect,
      depth: 1,
      guideCount: 0,
    })
  ).toEqual({
    left: 72,
    top: 80,
    width: 240,
    arrowOffset: 20,
    guideCount: 0,
  });

  expect(
    getManualDropLine({
      position: 'after',
      rowRect,
      depth: 1,
      guideCount: 0,
    })
  ).toEqual({
    left: 72,
    top: 112,
    width: 240,
    arrowOffset: 20,
    guideCount: 0,
  });
});

it('keeps the available hierarchy guide count', () => {
  expect(
    getManualDropLine({
      position: 'after',
      rowRect,
      depth: 3,
      guideCount: 2,
    })
  ).toEqual({
    left: 72,
    top: 112,
    width: 240,
    arrowOffset: 60,
    guideCount: 2,
  });
});

it('projects horizontal movement through each parent level', () => {
  expect(getProjectedDropDepth(1, -20)).toBe(0);
  expect(getProjectedDropDepth(2, -20)).toBe(1);
  expect(getProjectedDropDepth(3, -20)).toBe(2);
  expect(getProjectedDropDepth(3, -40)).toBe(1);
  expect(getProjectedDropDepth(3, -60)).toBe(0);
  expect(getProjectedDropDepth(1, 0)).toBe(1);
  expect(getProjectedDropDepth(1, 20)).toBe(2);
});

it('counts available hierarchy guides at subtree ends', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'first-child', depth: 2 },
    { id: 'last-child', depth: 2 },
    { id: 'parent-child', depth: 1 },
    { id: 'parent-sibling', depth: 0 },
  ];

  expect(getHierarchyGuideCount(items, 'first-child', 2, 'after')).toBe(0);
  expect(getHierarchyGuideCount(items, 'last-child', 2, 'after')).toBe(1);
  expect(getHierarchyGuideCount(items, 'last-child', 1, 'after')).toBe(0);
  expect(getHierarchyGuideCount(items, 'parent-child', 1, 'before')).toBe(0);
  expect(getHierarchyGuideCount(items, 'parent-sibling', 0, 'before')).toBe(0);

  const nestedItems = [
    { id: 'root', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'nested-folder', depth: 2 },
    { id: 'last-child', depth: 3 },
    { id: 'folder-sibling', depth: 1 },
  ];
  expect(getHierarchyGuideCount(nestedItems, 'last-child', 3, 'after')).toBe(2);
  expect(getHierarchyGuideCount(nestedItems, 'last-child', 2, 'after')).toBe(1);
  expect(getHierarchyGuideCount(nestedItems, 'last-child', 1, 'after')).toBe(0);

  const deeplyNestedItems = [
    { id: 'root', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'nested-folder', depth: 2 },
    { id: 'deep-folder', depth: 3 },
    { id: 'last-child', depth: 4 },
    { id: 'folder-sibling', depth: 1 },
  ];
  expect(
    getHierarchyGuideCount(deeplyNestedItems, 'last-child', 4, 'after')
  ).toBe(3);
  expect(
    getHierarchyGuideCount(deeplyNestedItems, 'last-child', 3, 'after')
  ).toBe(2);
  expect(
    getHierarchyGuideCount(deeplyNestedItems, 'last-child', 2, 'after')
  ).toBe(1);
  expect(
    getHierarchyGuideCount(deeplyNestedItems, 'last-child', 1, 'after')
  ).toBe(0);
});

it('projects a subtree end to either child or parent-level siblings', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'first-child', depth: 1 },
    { id: 'last-child', depth: 1 },
    { id: 'parent-sibling', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last-child', 1, 'after')).toEqual({
    targetId: 'last-child',
    position: 'after',
    depth: 1,
  });
  expect(resolveBoundaryDropTarget(items, 'last-child', 0, 'after')).toEqual({
    targetId: 'parent-sibling',
    position: 'before',
    depth: 0,
  });
});

it('keeps the hierarchy boundary when the dragged item is the only child', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'only-child', depth: 1 },
    { id: 'parent-sibling', depth: 0 },
  ];

  expect(
    resolveBoundaryDropTarget(items, 'parent-sibling', 1, 'before')
  ).toEqual({
    targetId: 'only-child',
    position: 'after',
    depth: 1,
  });
  expect(getHierarchyGuideCount(items, 'parent-sibling', 1, 'before')).toBe(1);
  expect(
    resolveBoundaryDropTarget(items, 'parent-sibling', 0, 'before')
  ).toEqual({
    targetId: 'parent-sibling',
    position: 'before',
    depth: 0,
  });

  const parentBoundary = getDragAwareDropBoundary(
    items,
    'parent',
    'after',
    'only-child'
  );
  expect(parentBoundary).toEqual({
    targetId: 'only-child',
    position: 'after',
  });
  expect(
    resolveBoundaryDropTarget(
      items,
      parentBoundary.targetId,
      0,
      parentBoundary.position
    )
  ).toEqual({
    targetId: 'parent-sibling',
    position: 'before',
    depth: 0,
  });
});

it('does not promote a dragged child when another child follows it', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'first-child', depth: 1 },
    { id: 'last-child', depth: 1 },
    { id: 'parent-sibling', depth: 0 },
  ];
  const boundary = getDragAwareDropBoundary(
    items,
    'parent',
    'after',
    'first-child'
  );

  expect(
    resolveBoundaryDropTarget(items, boundary.targetId, 0, boundary.position)
  ).toEqual({
    targetId: 'last-child',
    position: 'before',
    depth: 1,
  });
  expect(
    getHierarchyGuideCount(items, boundary.targetId, 1, boundary.position)
  ).toBe(0);
});

it('can promote an item at the end of the visible tree', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'first-child', depth: 1 },
    { id: 'last-child', depth: 1 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last-child', 0, 'after')).toEqual({
    targetId: 'parent',
    position: 'after',
    depth: 0,
  });
});

it('allows one parent level when only the current item is last', () => {
  const items = [
    { id: 'root', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'nested-folder', depth: 2 },
    { id: 'last-child', depth: 3 },
    { id: 'nested-sibling', depth: 2 },
    { id: 'root-sibling', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last-child', 2, 'after')).toEqual({
    targetId: 'nested-sibling',
    position: 'before',
    depth: 2,
  });
  expect(resolveBoundaryDropTarget(items, 'last-child', 0, 'after')).toEqual({
    targetId: 'nested-sibling',
    position: 'before',
    depth: 2,
  });
});

it('allows two parent levels when the parent is also last', () => {
  const items = [
    { id: 'root', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'nested-folder', depth: 2 },
    { id: 'last-child', depth: 3 },
    { id: 'folder-sibling', depth: 1 },
    { id: 'root-sibling', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last-child', 0, 'after')).toEqual({
    targetId: 'folder-sibling',
    position: 'before',
    depth: 1,
  });
});

it('allows every parent level at the end of the visible tree', () => {
  const items = [
    { id: 'root', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'nested-folder', depth: 2 },
    { id: 'last-child', depth: 3 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last-child', 0, 'after')).toEqual({
    targetId: 'root',
    position: 'after',
    depth: 0,
  });
});

it('keeps same-level boundaries inside their parent', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'first-child', depth: 1 },
    { id: 'second-child', depth: 1 },
    { id: 'parent-sibling', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'second-child', 2, 'before')).toEqual(
    {
      targetId: 'second-child',
      position: 'before',
      depth: 1,
    }
  );
  expect(resolveBoundaryDropTarget(items, 'second-child', 0, 'before')).toEqual(
    {
      targetId: 'second-child',
      position: 'before',
      depth: 1,
    }
  );
  expect(resolveBoundaryDropTarget(items, 'first-child', 0, 'after')).toEqual({
    targetId: 'second-child',
    position: 'before',
    depth: 1,
  });
});

it('does not project the start of a subtree back to the parent level', () => {
  const items = [
    { id: 'folder', depth: 0 },
    { id: 'first-child', depth: 1 },
    { id: 'sibling', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'folder', 1, 'after')).toEqual({
    targetId: 'first-child',
    position: 'before',
    depth: 1,
  });
  expect(resolveBoundaryDropTarget(items, 'folder', 0, 'after')).toEqual({
    targetId: 'first-child',
    position: 'before',
    depth: 1,
  });
});
