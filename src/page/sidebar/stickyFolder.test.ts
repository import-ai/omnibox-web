import { findStickyFolder } from './stickyFolder';

const folders = [
  { id: 'parent', top: 0, bottom: 1000, depth: 0 },
  { id: 'child', top: 100, bottom: 700, depth: 1 },
  { id: 'deep', top: 200, bottom: 500, depth: 2 },
  { id: 'sibling', top: 1000, bottom: 1500, depth: 0 },
];

it('keeps the original title without a duplicate at the top', () => {
  expect(findStickyFolder(folders, 0)).toBeNull();
  expect(findStickyFolder(folders, 100)).toBe('parent');
});
it('shows only the nearest expanded folder, regardless of selection', () => {
  expect(findStickyFolder(folders, 250)).toBe('deep');
});
it('hands back to the parent when the child subtree ends or collapses', () => {
  expect(findStickyFolder(folders, 500)).toBe('child');
  expect(
    findStickyFolder(
      folders.filter(f => f.id !== 'deep'),
      250
    )
  ).toBe('child');
});
it('does not leak across sibling folders or into the next section', () => {
  expect(findStickyFolder(folders, 990)).toBeNull();
  expect(findStickyFolder(folders, 1050)).toBe('sibling');
  expect(findStickyFolder(folders, 1500)).toBeNull();
});
