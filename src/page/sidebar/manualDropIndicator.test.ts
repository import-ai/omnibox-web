import {
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
    })
  ).toEqual({
    left: 72,
    top: 112,
    width: 240,
    arrowOffset: 40,
    guideOffset: 20,
  });
});

it('keeps sibling indicators at the target level', () => {
  expect(
    getManualDropLine({
      position: 'before',
      rowRect,
      depth: 1,
    })
  ).toEqual({
    left: 72,
    top: 80,
    width: 240,
    arrowOffset: 20,
    guideOffset: 0,
  });

  expect(
    getManualDropLine({
      position: 'after',
      rowRect,
      depth: 1,
    })
  ).toEqual({
    left: 72,
    top: 112,
    width: 240,
    arrowOffset: 20,
    guideOffset: 0,
  });
});

it('projects the dragged resource depth from its horizontal movement', () => {
  expect(getProjectedDropDepth(1, -20)).toBe(0);
  expect(getProjectedDropDepth(2, -20)).toBe(1);
  expect(getProjectedDropDepth(1, 0)).toBe(1);
  expect(getProjectedDropDepth(1, 20)).toBe(2);
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

it('outdents one level at a subtree boundary', () => {
  const items = [
    { id: 'root', depth: 0 },
    { id: 'folder', depth: 1 },
    { id: 'last-child', depth: 2 },
    { id: 'root-sibling', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last-child', 1, 'after')).toEqual({
    targetId: 'folder',
    position: 'after',
    depth: 1,
  });
});

it('outdents a same-level boundary without creating a child level', () => {
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
      targetId: 'parent-sibling',
      position: 'before',
      depth: 0,
    }
  );
  expect(resolveBoundaryDropTarget(items, 'first-child', 0, 'after')).toEqual({
    targetId: 'parent-sibling',
    position: 'before',
    depth: 0,
  });
});

it('can project the start of a subtree back to the parent level', () => {
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
    targetId: 'sibling',
    position: 'before',
    depth: 0,
  });
});
