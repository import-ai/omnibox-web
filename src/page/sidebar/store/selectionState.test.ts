import { createNodeSelectionStateSelector } from './selectionState';
import type { SidebarState, TreeNode } from './types';
import { calculateSelectedCount, getTopLevelSelectedIds } from './utils';

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  isSmartFolderChildResource: () => false,
}));

function node(
  id: string,
  parentId: string | null,
  children: string[] = []
): TreeNode {
  return {
    id,
    parentId,
    children,
    hasChildren: children.length > 0,
    readOnly: false,
  } as TreeNode;
}

const nodes = {
  root: node('root', null, ['folder', 'other']),
  folder: node('folder', 'root', ['nested', 'sibling']),
  nested: node('nested', 'folder', ['leaf']),
  leaf: node('leaf', 'nested'),
  sibling: node('sibling', 'folder'),
  other: node('other', 'root'),
};

describe('sidebar checkbox state', () => {
  const select = createNodeSelectionStateSelector();
  const state = (
    selectedIds: Record<string, boolean>
  ): Pick<SidebarState, 'nodes' | 'selectedIds' | 'ui'> => ({
    nodes,
    selectedIds,
    ui: {
      folder: { loaded: true, loading: false, expanded: true },
      nested: { loaded: true, loading: false, expanded: true },
    },
  });

  it('checks a single-child folder and marks its partially selected ancestor mixed', () => {
    const s = state({ leaf: true });
    expect(select(s, 'leaf')).toBe(true);
    expect(select(s, 'nested')).toBe(true);
    expect(select(s, 'folder')).toBe('indeterminate');
    expect(select(s, 'other')).toBe(false);
    expect(select(s, 'root')).toBe(false);
    expect(calculateSelectedCount(s.nodes, s.selectedIds)).toBe(1);
    expect(getTopLevelSelectedIds(s.nodes, Object.keys(s.selectedIds))).toEqual(
      ['leaf']
    );
    expect(s.selectedIds).toEqual({ leaf: true });
  });

  it('gives direct and inherited selection precedence over mixed state', () => {
    const s = state({ folder: true, leaf: true });
    expect(select(s, 'folder')).toBe(true);
    expect(select(s, 'nested')).toBe(true);
    expect(select(s, 'sibling')).toBe(true);
  });

  it('checks a folder when all of its children are individually selected', () => {
    const s = state({ nested: true, sibling: true });
    expect(select(s, 'folder')).toBe(true);
    expect(s.selectedIds).toEqual({ nested: true, sibling: true });
    expect(calculateSelectedCount(s.nodes, s.selectedIds)).toBe(2);
  });

  it('checks all ancestors when every leaf in a nested folder is selected', () => {
    const s = state({ leaf: true, sibling: true });
    expect(select(s, 'nested')).toBe(true);
    expect(select(s, 'folder')).toBe(true);
  });

  it('does not infer full selection from a partially loaded child list', () => {
    const s = state({ leaf: true });
    s.ui.nested.loaded = false;
    expect(select(s, 'nested')).toBe('indeterminate');
  });

  it('updates when loading completes without changing the tree or selections', () => {
    const s = state({ leaf: true });
    const pending = {
      ...s,
      ui: { ...s.ui, nested: { ...s.ui.nested, loaded: false } },
    };
    expect(select(pending, 'nested')).toBe('indeterminate');
    expect(select(s, 'nested')).toBe(true);
  });

  it('does not treat an unselected empty folder as fully selected', () => {
    expect(select(state({}), 'other')).toBe(false);
  });

  it('clears mixed state when the last selected descendant is deselected', () => {
    expect(select(state({ leaf: true }), 'folder')).toBe('indeterminate');
    expect(select(state({}), 'folder')).toBe(false);
  });

  it('ignores false selections and missing resources', () => {
    const s = state({ leaf: false, missing: true });
    expect(select(s, 'folder')).toBe(false);
    expect(select(s, 'missing')).toBe(false);
  });

  it('updates both ancestor paths when a selected node moves without selection changes', () => {
    const s = state({ leaf: true });
    expect(select(s, 'folder')).toBe('indeterminate');
    const moved = { ...s, nodes: { ...nodes, leaf: node('leaf', 'other') } };
    expect(select(moved, 'folder')).toBe(false);
    expect(select(moved, 'other')).toBe('indeterminate');
  });

  it('uses the parent chain even when child lists have not been loaded', () => {
    const s = {
      ...state({ leaf: true }),
      nodes: {
        ...nodes,
        folder: node('folder', 'root'),
        nested: node('nested', 'folder'),
      },
    };
    expect(select(s, 'folder')).toBe('indeterminate');
    expect(select(s, 'nested')).toBe('indeterminate');
  });
});
