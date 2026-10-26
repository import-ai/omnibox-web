import {
  flattenExpandedResources,
  folderSpans,
  visibleRowRange,
} from './virtualResourceTree';

const nodes = {
  a: { hasChildren: true, children: ['b', 'c'] },
  b: { hasChildren: true, children: [] },
  c: { hasChildren: false, children: [] },
  d: { hasChildren: true, children: ['e'] },
  e: { hasChildren: false, children: [] },
};

it('flattens only expanded branches and keeps sibling order', () => {
  const rows = flattenExpandedResources(
    ['a', 'd'],
    nodes,
    id => id === 'a' || id === 'b' || id === 'd',
    id => id === 'b'
  );
  expect(rows.map(row => row.id)).toEqual(['a', 'b', 'b:empty', 'c', 'd', 'e']);
  expect(rows.find(row => row.id === 'c')).toMatchObject({ depth: 1 });
  expect(rows.find(row => row.id === 'e')).toMatchObject({ depth: 1 });
});

it('omits children of a collapsed node', () => {
  const rows = flattenExpandedResources(
    ['a'],
    nodes,
    () => false,
    () => true
  );
  expect(rows).toEqual([{ kind: 'node', id: 'a', depth: 0 }]);
});

it('windows rows around the viewport and clamps the ends', () => {
  expect(visibleRowRange(100, 340, 100, 0, 34, 2)).toEqual({
    start: 8,
    end: 15,
  });
  expect(visibleRowRange(10, 0, 50, 200, 34, 8)).toEqual({ start: 0, end: 4 });
  expect(visibleRowRange(0, 0, 100, 0)).toEqual({ start: 0, end: 0 });
});

it('spans a folder through its descendants and skips leaves', () => {
  const rows = flattenExpandedResources(
    ['a', 'd'],
    nodes,
    id => id === 'a',
    () => false
  );
  expect(folderSpans(rows)).toEqual([{ id: 'a', depth: 0, start: 0, end: 3 }]);
});
