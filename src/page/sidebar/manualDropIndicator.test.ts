import {
  getManualDropLine,
  getProjectedDropDepth,
  resolveBoundaryDropTarget,
} from './manualDropIndicator';

const rowRect = { left: 72, top: 80, bottom: 112, width: 240 };
const treeRect = { left: 72, top: 80, bottom: 176, width: 240 };

it('places a child indicator after the target subtree with a parent guide', () => {
  expect(
    getManualDropLine({
      position: 'inside',
      rowRect,
      treeRect,
      depth: 2,
    })
  ).toEqual({
    left: 72,
    top: 176,
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
      treeRect,
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
      treeRect,
      nextRowRect: { left: 72, top: 200, bottom: 232, width: 240 },
      depth: 1,
    })
  ).toEqual({
    left: 72,
    top: 200,
    width: 240,
    arrowOffset: 20,
    guideOffset: 0,
  });
});

it('projects the dragged resource depth from its horizontal movement', () => {
  expect(getProjectedDropDepth(1, -20)).toBe(0);
  expect(getProjectedDropDepth(1, 0)).toBe(1);
  expect(getProjectedDropDepth(1, 20)).toBe(2);
});

it('projects a shared boundary to either child or root siblings', () => {
  const items = [
    {
      id: 'video',
      depth: 0,
    },
    { id: 'first', depth: 1 },
    { id: 'last', depth: 1 },
    { id: 'folder', depth: 0 },
  ];

  expect(resolveBoundaryDropTarget(items, 'last', 1, 'after')).toEqual({
    targetId: 'last',
    position: 'after',
    depth: 1,
  });
  expect(resolveBoundaryDropTarget(items, 'last', 0, 'after')).toEqual({
    targetId: 'folder',
    position: 'before',
    depth: 0,
  });
});

it('does not create a deeper level between same-level items', () => {
  const items = [
    { id: 'parent', depth: 0 },
    { id: 'first-child', depth: 1 },
    { id: 'second-child', depth: 1 },
    { id: 'root-sibling', depth: 0 },
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
      targetId: 'root-sibling',
      position: 'before',
      depth: 0,
    }
  );
});

it('uses the next visible child when inserting at the start of a subtree', () => {
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
