jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  moveResource: jest.fn(),
  updateManualSort: jest.fn(),
}));
import type { ResourceType, SpaceType } from '@/interface';
import {
  fetchChildren,
  moveResource,
  updateManualSort,
} from '@/service/resource';
import { RSS_ITEM_TREE_LIMIT } from '@/service/resourceSort';

import type { SidebarStore, TreeNode } from '../types';
import { buildManualOrder, buildManualSortActions } from './manualSort';

const mockedFetchChildren = jest.mocked(fetchChildren);
const mockedMoveResource = jest.mocked(moveResource);
const mockedUpdateManualSort = jest.mocked(updateManualSort);

function node(
  id: string,
  parentId: string | null,
  spaceType: SpaceType,
  children: string[] = [],
  resourceType: ResourceType = 'folder'
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

beforeEach(() => {
  jest.clearAllMocks();
});

it('moves a resource before or after a sibling without duplicating it', () => {
  const children = ['a', 'b', 'c', 'd'];

  expect(buildManualOrder(children, 'd', 'b', 'before')).toEqual([
    'a',
    'd',
    'b',
    'c',
  ]);
  expect(buildManualOrder(children, 'a', 'c', 'after')).toEqual([
    'b',
    'c',
    'a',
    'd',
  ]);
});

it('keeps a successful cross-space move when manual sort syncing fails', async () => {
  const state = {
    namespaceId: 'namespace',
    nodes: {
      private: node('private', null, 'private', ['source']),
      teamspace: node('teamspace', null, 'teamspace', ['target']),
      source: node('source', 'private', 'private', ['drag']),
      target: node('target', 'teamspace', 'teamspace', ['existing']),
      drag: node('drag', 'source', 'private', [], 'doc'),
      existing: node('existing', 'target', 'teamspace', [], 'doc'),
    },
    ui: {
      target: { expanded: true, loading: false, loaded: true },
    },
    rootIds: { private: 'private', teamspace: 'teamspace' },
    resourceSorts: {
      private: { sort_by: 'manual', sort_order: 'asc' },
      teamspace: { sort_by: 'manual', sort_order: 'asc' },
    },
  } as SidebarStore;
  state.nodes.teamspace.manualSortInitializedAt = '2026-08-05T00:00:00.000Z';
  const actions = buildManualSortActions(
    update => update(state),
    () => state
  );
  mockedMoveResource.mockResolvedValue(undefined);
  mockedUpdateManualSort
    .mockRejectedValueOnce(new Error('Sort sync failed'))
    .mockResolvedValue(undefined);
  mockedFetchChildren.mockRejectedValue(new Error('Refresh failed'));
  const onSortSyncFailure = jest.fn();

  await expect(
    actions.applyManualDrop(
      {
        dragId: 'drag',
        targetId: 'target',
        position: 'inside',
      },
      onSortSyncFailure
    )
  ).resolves.toBeUndefined();

  expect(state.nodes.source.children).toEqual([]);
  expect(state.nodes.target.children).toEqual(['existing', 'drag']);
  expect(state.nodes.drag.parentId).toBe('target');
  expect(state.nodes.drag.spaceType).toBe('teamspace');
  expect(mockedUpdateManualSort).toHaveBeenCalledWith(
    'namespace',
    {
      root_resource_id: 'teamspace',
      orders: [{ parent_id: 'target', resource_ids: ['existing', 'drag'] }],
    },
    { mute: true }
  );
  expect(mockedUpdateManualSort).toHaveBeenCalledTimes(1);
  expect(onSortSyncFailure).toHaveBeenCalledTimes(1);
});

it('does not overwrite historical source order when its current sort is automatic', async () => {
  const state = {
    namespaceId: 'namespace',
    nodes: {
      private: node('private', null, 'private', ['source']),
      teamspace: node('teamspace', null, 'teamspace', ['target']),
      source: node('source', 'private', 'private', ['drag', 'source-sibling']),
      target: node('target', 'teamspace', 'teamspace', ['existing']),
      drag: node('drag', 'source', 'private', [], 'doc'),
      'source-sibling': node('source-sibling', 'source', 'private', [], 'doc'),
      existing: node('existing', 'target', 'teamspace', [], 'doc'),
    },
    ui: {
      target: { expanded: true, loading: false, loaded: true },
    },
    rootIds: { private: 'private', teamspace: 'teamspace' },
    resourceSorts: {
      private: { sort_by: 'updated_at', sort_order: 'desc' },
      teamspace: { sort_by: 'manual', sort_order: 'asc' },
    },
  } as SidebarStore;
  state.nodes.private.manualSortInitializedAt = '2026-08-05T00:00:00.000Z';
  state.nodes.teamspace.manualSortInitializedAt = '2026-08-05T00:00:00.000Z';
  const actions = buildManualSortActions(
    update => update(state),
    () => state
  );
  mockedMoveResource.mockResolvedValue(undefined);
  mockedUpdateManualSort.mockResolvedValue(undefined);

  await actions.applyManualDrop({
    dragId: 'drag',
    targetId: 'target',
    position: 'inside',
  });

  expect(mockedUpdateManualSort).toHaveBeenCalledTimes(1);
  expect(mockedUpdateManualSort).toHaveBeenCalledWith(
    'namespace',
    {
      root_resource_id: 'teamspace',
      orders: [{ parent_id: 'target', resource_ids: ['existing', 'drag'] }],
    },
    { mute: true }
  );
});

it('bounds the children it loads for an unopened rss folder drop target', async () => {
  const state = {
    namespaceId: 'namespace',
    nodes: {
      private: node('private', null, 'private', ['source', 'feed']),
      source: node('source', 'private', 'private', ['drag']),
      feed: node('feed', 'private', 'private', [], 'rss_folder'),
      drag: node('drag', 'source', 'private', [], 'doc'),
    },
    ui: {},
    rootIds: { private: 'private', teamspace: '' },
    resourceSorts: {
      private: { sort_by: 'manual', sort_order: 'asc' },
      teamspace: { sort_by: 'manual', sort_order: 'asc' },
    },
  } as unknown as SidebarStore;
  const actions = buildManualSortActions(
    update => update(state),
    () => state
  );
  state.refreshChildren = jest.fn();
  mockedFetchChildren.mockResolvedValue([]);
  mockedMoveResource.mockResolvedValue(undefined);
  mockedUpdateManualSort.mockResolvedValue(undefined);

  await actions.applyManualDrop({
    dragId: 'drag',
    targetId: 'feed',
    position: 'inside',
  });

  // A feed holds thousands of poller-owned rows; loading them all to work out
  // an order would stall the drop.
  expect(mockedFetchChildren).toHaveBeenCalledWith(
    'namespace',
    'feed',
    { sort_by: 'manual', sort_order: 'asc' },
    { params: { limit: RSS_ITEM_TREE_LIMIT } }
  );
});
