jest.mock('@/service/resource', () => ({
  batchCreateFolderFromResources: jest.fn(),
  batchDeleteResources: jest.fn(),
  batchMoveResources: jest.fn(),
  fetchChildren: jest.fn(),
}));

import type { Resource, ResourceType, SpaceType } from '@/interface';
import {
  batchCreateFolderFromResources,
  batchMoveResources,
  fetchChildren,
} from '@/service/resource';

import type { SidebarStore, TreeNode } from '../types';
import { initialDialogsState } from '../types';
import { buildBatchActions } from './batch';

const mockedBatchMoveResources = jest.mocked(batchMoveResources);
const mockedBatchCreateFolderFromResources = jest.mocked(
  batchCreateFolderFromResources
);
const mockedFetchChildren = jest.mocked(fetchChildren);

function node(
  id: string,
  parentId: string | null,
  children: string[] = [],
  resourceType: ResourceType = 'folder',
  spaceType: SpaceType = 'private'
): TreeNode {
  return {
    id,
    parentId,
    spaceType,
    name: id,
    resourceType,
    hasChildren: children.length > 0,
    readOnly: false,
    createdAt: '',
    updatedAt: '',
    manualSortInitializedAt: null,
    children,
  };
}

function createStore(nodes: Record<string, TreeNode>): SidebarStore {
  const state = {
    namespaceId: 'namespace',
    nodes,
    ui: {},
    rootIds: { private: 'private', teamspace: 'teamspace' },
    activeId: null,
    dialogs: structuredClone(initialDialogsState),
    selectedIds: {},
    selectionMode: false,
    lastSelectedId: null,
    resourceSorts: {
      private: { sort_by: 'manual', sort_order: 'asc' },
      teamspace: { sort_by: 'manual', sort_order: 'asc' },
    },
  } as SidebarStore;
  state.refreshChildren = (parentId, resources) => {
    state.nodes[parentId].children = resources.map(resource => resource.id);
  };
  return state;
}

function resource(id: string, parentId: string): Resource {
  return {
    id,
    parent_id: parentId,
    space_type: 'private',
    resource_type: id === 'new-folder' ? 'folder' : 'doc',
    has_children: false,
  } as Resource;
}

function actionsFor(state: SidebarStore) {
  return buildBatchActions(
    update => update(state),
    () => state
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('appends batch-moved resources in manual sort mode', async () => {
  const state = createStore({
    private: node('private', null, ['source', 'target']),
    source: node('source', 'private', ['move-a', 'move-b']),
    target: node('target', 'private', ['existing']),
    existing: node('existing', 'target', [], 'doc'),
    'move-a': node('move-a', 'source', [], 'doc'),
    'move-b': node('move-b', 'source', [], 'doc'),
  });
  mockedBatchMoveResources.mockResolvedValue({
    success_ids: ['move-a', 'move-b'],
    failed_ids: [],
  });

  await actionsFor(state).batchMove(['move-a', 'move-b'], 'target');

  expect(state.nodes.target.children).toEqual(['existing', 'move-a', 'move-b']);
});

it('appends a batch-created folder in manual sort mode', async () => {
  const state = createStore({
    private: node('private', null, ['existing', 'move-a', 'move-b']),
    existing: node('existing', 'private', [], 'doc'),
    'move-a': node('move-a', 'private', [], 'doc'),
    'move-b': node('move-b', 'private', [], 'doc'),
  });
  state.selectedIds = { 'move-a': true, 'move-b': true };
  mockedBatchCreateFolderFromResources.mockResolvedValue({
    id: 'new-folder',
    parent_id: 'private',
    resource_type: 'folder',
    space_type: 'private',
    has_children: true,
    success_ids: ['move-a', 'move-b'],
    failed_ids: [],
  });

  await actionsFor(state).batchCreate('New folder', 'private');

  expect(state.nodes.private.children).toEqual(['existing', 'new-folder']);
  expect(state.nodes['new-folder'].children).toEqual(['move-a', 'move-b']);
});

it('refreshes batch-moved resources using the current automatic sort', async () => {
  const state = createStore({
    private: node('private', null, ['source', 'target']),
    source: node('source', 'private', ['move-a', 'move-b']),
    target: node('target', 'private', ['existing']),
    existing: node('existing', 'target', [], 'doc'),
    'move-a': node('move-a', 'source', [], 'doc'),
    'move-b': node('move-b', 'source', [], 'doc'),
  });
  state.resourceSorts.private = {
    sort_by: 'title',
    sort_order: 'asc',
  };
  mockedBatchMoveResources.mockResolvedValue({
    success_ids: ['move-a', 'move-b'],
    failed_ids: [],
  });
  mockedFetchChildren.mockResolvedValue([
    resource('existing', 'target'),
    resource('move-a', 'target'),
    resource('move-b', 'target'),
  ]);

  await actionsFor(state).batchMove(['move-a', 'move-b'], 'target');

  expect(mockedFetchChildren).toHaveBeenCalledWith(
    'namespace',
    'target',
    { sort_by: 'title', sort_order: 'asc' },
    { mute: true }
  );
  expect(state.nodes.target.children).toEqual(['existing', 'move-a', 'move-b']);
});

it('refreshes a batch-created folder using the current automatic sort', async () => {
  const state = createStore({
    private: node('private', null, ['existing', 'move-a']),
    existing: node('existing', 'private', [], 'doc'),
    'move-a': node('move-a', 'private', [], 'doc'),
  });
  state.resourceSorts.private = {
    sort_by: 'updated_at',
    sort_order: 'desc',
  };
  state.selectedIds = { 'move-a': true };
  mockedBatchCreateFolderFromResources.mockResolvedValue({
    id: 'new-folder',
    parent_id: 'private',
    resource_type: 'folder',
    space_type: 'private',
    has_children: true,
    success_ids: ['move-a'],
    failed_ids: [],
  });
  mockedFetchChildren.mockResolvedValue([
    resource('new-folder', 'private'),
    resource('existing', 'private'),
  ]);

  await actionsFor(state).batchCreate('New folder', 'private');

  expect(mockedFetchChildren).toHaveBeenCalledWith(
    'namespace',
    'private',
    { sort_by: 'updated_at', sort_order: 'desc' },
    { mute: true }
  );
  expect(state.nodes.private.children).toEqual(['new-folder', 'existing']);
});

describe('rss items in a batch selection', () => {
  function rssStore() {
    return createStore({
      private: node('private', null, ['feed', 'doc-a']),
      feed: node('feed', 'private', ['item-a', 'item-b'], 'rss_folder'),
      'item-a': node('item-a', 'feed', [], 'rss_item'),
      'item-b': node('item-b', 'feed', [], 'rss_item'),
      'doc-a': node('doc-a', 'private', [], 'doc'),
    });
  }

  it('refuses to move them out of their feed', async () => {
    const state = rssStore();

    const result = await actionsFor(state).batchMove(['item-a'], 'private');

    expect(result.unsupportedTipKey).toBe('batch.rss_item_unsupported_action');
    expect(result.success).toEqual([]);
    expect(mockedBatchMoveResources).not.toHaveBeenCalled();
  });

  it('refuses to gather them into a new folder', async () => {
    const state = rssStore();
    state.selectedIds = { 'item-a': true, 'doc-a': true };

    const result = await actionsFor(state).batchCreate('Gathered', 'private');

    expect(result.unsupportedTipKey).toBe('batch.rss_item_unsupported_action');
    expect(mockedBatchCreateFolderFromResources).not.toHaveBeenCalled();
  });

  it('refuses to delete them on their own', async () => {
    const state = rssStore();

    const result = await actionsFor(state).batchRemove(['item-a', 'item-b']);

    expect(result.unsupportedTipKey).toBe('batch.rss_item_unsupported_action');
    expect(result.success).toEqual([]);
  });

  it('still moves and deletes the feed folder itself', async () => {
    const state = rssStore();
    mockedBatchMoveResources.mockResolvedValue({
      success_ids: ['feed'],
      failed_ids: [],
    });

    // Selecting the folder implies its items, but they are not top-level:
    // the operation is about the folder, which owns them.
    const result = await actionsFor(state).batchMove(
      ['feed', 'item-a', 'item-b'],
      'private'
    );

    expect(result.unsupportedTipKey).toBeUndefined();
    expect(mockedBatchMoveResources).toHaveBeenCalled();
  });
});
