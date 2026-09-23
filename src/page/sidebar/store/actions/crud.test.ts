jest.mock('@/service/resource', () => ({
  createResource: jest.fn(),
  moveResource: jest.fn(),
  renameResource: jest.fn(),
  restoreResource: jest.fn(),
}));

import type { SpaceType } from '@/interface';
import { moveResource } from '@/service/resource';

import type { SidebarStore, TreeNode } from '../types';
import { buildCRUDActions } from './crud';

const mockedMoveResource = jest.mocked(moveResource);

function node(
  id: string,
  parentId: string | null,
  spaceType: SpaceType,
  children: string[] = []
): TreeNode {
  return {
    id,
    parentId,
    spaceType,
    name: id,
    resourceType: 'folder',
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

it('loads an uncached third-level destination before submitting the move', async () => {
  const state = {
    namespaceId: 'namespace',
    nodes: {
      private: node('private', null, 'private', ['resource', 'first']),
      resource: node('resource', 'private', 'private'),
      first: node('first', 'private', 'private'),
    },
    ui: {},
    rootIds: { private: 'private', teamspace: '' },
    resourceSorts: {
      private: { sort_by: 'manual', sort_order: 'asc' },
      teamspace: { sort_by: 'manual', sort_order: 'asc' },
    },
    expandPathTo: jest.fn(async () => {
      state.nodes.second = node('second', 'first', 'private', ['third']);
      state.nodes.third = node('third', 'second', 'private');
    }),
  } as unknown as SidebarStore;
  const actions = buildCRUDActions(
    update => update(state),
    () => state
  );
  mockedMoveResource.mockResolvedValue(undefined);

  await actions.move('resource', 'third');

  expect(state.expandPathTo).toHaveBeenCalledWith('third');
  expect(mockedMoveResource).toHaveBeenCalledWith(
    'namespace',
    'resource',
    'third'
  );
  expect(state.nodes.resource.parentId).toBe('third');
  expect(state.nodes.third.children).toContain('resource');
  expect(state.nodes.private.children).not.toContain('resource');
});

it('ignores a move that targets the resource itself', async () => {
  const state = {
    namespaceId: 'namespace',
    nodes: {
      private: node('private', null, 'private', ['resource']),
      resource: node('resource', 'private', 'private'),
    },
    ui: {},
    rootIds: { private: 'private', teamspace: '' },
    resourceSorts: {
      private: { sort_by: 'manual', sort_order: 'asc' },
      teamspace: { sort_by: 'manual', sort_order: 'asc' },
    },
  } as unknown as SidebarStore;
  const actions = buildCRUDActions(
    update => update(state),
    () => state
  );

  await actions.move('resource', 'resource');

  expect(state.nodes.private.children).toEqual(['resource']);
  expect(state.nodes.resource.parentId).toBe('private');
  expect(state.nodes.resource.children).toEqual([]);
  expect(mockedMoveResource).not.toHaveBeenCalled();
});
