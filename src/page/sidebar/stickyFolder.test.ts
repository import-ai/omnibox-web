import { findStickyFolder } from './stickyFolder';

const folders = [
  { id: 'parent', top: 0, bottom: 1000, depth: 0 },
  { id: 'child', top: 100, bottom: 700, depth: 1 },
  { id: 'deep', top: 200, bottom: 500, depth: 2 },
  { id: 'sibling', top: 1000, bottom: 1500, depth: 0 },
];

it('keeps the original title without a duplicate at the top', () => {
  expect(findStickyFolder(folders, 0, 36)).toBeNull();
  expect(findStickyFolder(folders, 100, 36)).toBe('parent');
});
it('shows only the nearest expanded folder, regardless of selection', () => {
  expect(findStickyFolder(folders, 250, 36)).toBe('deep');
});
it('hands back to the parent when the child subtree ends or collapses', () => {
  expect(findStickyFolder(folders, 500, 36)).toBe('child');
  expect(
    findStickyFolder(
      folders.filter(f => f.id !== 'deep'),
      250,
      36
    )
  ).toBe('child');
});
it('does not leak across sibling folders or into the next section', () => {
  expect(findStickyFolder(folders, 990, 36)).toBeNull();
  expect(findStickyFolder(folders, 1050, 36)).toBe('sibling');
  expect(findStickyFolder(folders, 1500, 36)).toBeNull();
});

it('uses the measured row height at subtree boundaries', () => {
  expect(findStickyFolder(folders, 460, 36)).toBe('deep');
  expect(findStickyFolder(folders, 460, 48)).toBe('child');
});
