import type { Resource } from '@/interface';

import type { TreeNode } from './types';
import {
  collapseEmptyNode,
  createNode,
  getBatchSelectionSummary,
  getBatchUnsupportedTipKey,
  isBatchSelectableNode,
} from './utils';

jest.mock('@/page/sidebar/components/smart-folder', () => ({
  isSmartFolderChildResource: (node?: { id?: string }) =>
    node?.id?.startsWith('smart-folder-child-') === true,
}));

function node(
  id: string,
  parentId: string | null,
  resourceType: TreeNode['resourceType'],
  children: string[] = []
): TreeNode {
  return {
    id,
    parentId,
    spaceType: 'private',
    name: id,
    resourceType,
    hasChildren: children.length > 0,
    readOnly: resourceType === 'rss_item',
    createdAt: '',
    updatedAt: '',
    manualSortInitializedAt: null,
    children,
  } as TreeNode;
}

const nodes: Record<string, TreeNode> = {
  private: node('private', null, 'folder', ['feed', 'doc-a', 'smart']),
  feed: node('feed', 'private', 'rss_folder', ['item-a', 'item-b']),
  'item-a': node('item-a', 'feed', 'rss_item'),
  'item-b': node('item-b', 'feed', 'rss_item'),
  'doc-a': node('doc-a', 'private', 'doc'),
  smart: node('smart', 'private', 'smart_folder'),
};

describe('managed folder expansion', () => {
  it.each(['rss_folder', 'smart_folder'] as const)(
    'keeps an empty %s expandable',
    resourceType => {
      const managed = createNode(
        {
          id: resourceType,
          name: resourceType,
          parent_id: null,
          resource_type: resourceType,
          has_children: false,
        } as Resource,
        null,
        'private'
      );
      const state = {
        nodes: { [managed.id]: managed },
        ui: {
          [managed.id]: { expanded: true, loaded: true, loading: false },
        },
      };

      collapseEmptyNode(state, managed.id);

      expect(managed.hasChildren).toBe(true);
      expect(state.ui[managed.id].expanded).toBe(true);
    }
  );
});

describe('isBatchSelectableNode', () => {
  it('gives an rss item a checkbox despite it being read-only', () => {
    expect(isBatchSelectableNode(nodes['item-a'])).toBe(true);
  });

  it('still refuses smart folder children', () => {
    expect(
      isBatchSelectableNode(node('smart-folder-child-x', 'smart', 'doc'))
    ).toBe(false);
  });
});

describe('getBatchSelectionSummary', () => {
  it('flags a selection containing rss items', () => {
    const summary = getBatchSelectionSummary(nodes, ['item-a', 'doc-a']);

    expect(summary).toMatchObject({ selectedCount: 2, hasRssItem: true });
  });

  it('does not flag the feed folder itself, nor the items it implies', () => {
    // Selecting a folder covers its children, but the operation is about the
    // folder — which can be moved and deleted like any other.
    const summary = getBatchSelectionSummary(nodes, [
      'feed',
      'item-a',
      'item-b',
    ]);

    expect(summary).toMatchObject({ selectedCount: 1, hasRssItem: false });
  });
});

describe('getBatchUnsupportedTipKey', () => {
  const rss = getBatchSelectionSummary(nodes, ['item-a']);
  const smart = getBatchSelectionSummary(nodes, ['smart']);
  const plain = getBatchSelectionSummary(nodes, ['doc-a']);

  it.each(['create', 'move', 'delete'] as const)(
    'refuses %s for an rss item',
    action => {
      expect(getBatchUnsupportedTipKey(rss, action)).toBe(
        'batch.rss_item_unsupported_action'
      );
    }
  );

  it('keeps delete available for a smart folder', () => {
    expect(getBatchUnsupportedTipKey(smart, 'move')).toBe(
      'batch.smart_folder_unsupported_action'
    );
    expect(getBatchUnsupportedTipKey(smart, 'delete')).toBeUndefined();
  });

  it('allows everything for an ordinary resource', () => {
    expect(getBatchUnsupportedTipKey(plain, 'create')).toBeUndefined();
    expect(getBatchUnsupportedTipKey(plain, 'move')).toBeUndefined();
    expect(getBatchUnsupportedTipKey(plain, 'delete')).toBeUndefined();
  });
});
