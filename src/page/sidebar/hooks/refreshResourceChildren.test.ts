jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
}));

jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/page/sidebar/store/utils', () => ({
  getNodeResourceSort: jest.fn(() => ({
    sort_by: 'updated_at',
    sort_order: 'desc',
  })),
}));

import { fetchChildren } from '@/service/resource';

import { useSidebarStore } from '../store';
import {
  getResourceParentsToRefresh,
  refreshSidebarResourceChildren,
} from './refreshResourceChildren';

const mockedFetchChildren = jest.mocked(fetchChildren);
const mockedGetState = jest.mocked(useSidebarStore.getState);

function createStore(options?: {
  nodes?: Record<string, { resourceType?: string }>;
  expandPathTo?: jest.Mock;
  refreshChildren?: jest.Mock;
}) {
  return {
    nodes: options?.nodes ?? {},
    expandPathTo:
      options?.expandPathTo ?? jest.fn().mockResolvedValue(undefined),
    refreshChildren: options?.refreshChildren ?? jest.fn(),
  };
}

describe('getResourceParentsToRefresh', () => {
  it('refreshes the new parent first and the previous parent second', () => {
    expect(
      getResourceParentsToRefresh({
        previousParentId: 'old-folder',
        nextParentId: 'new-folder',
        nodes: {
          'old-folder': { resourceType: 'folder' },
          'new-folder': { resourceType: 'folder' },
        },
      })
    ).toEqual(['new-folder', 'old-folder']);
  });

  it('still refreshes a parent that is not loaded in the sidebar tree', () => {
    expect(
      getResourceParentsToRefresh({
        previousParentId: 'old-folder',
        nextParentId: 'missing-folder',
        nodes: {
          'old-folder': { resourceType: 'folder' },
        },
      })
    ).toEqual(['missing-folder', 'old-folder']);
  });

  it('skips smart folders', () => {
    expect(
      getResourceParentsToRefresh({
        previousParentId: 'smart',
        nextParentId: 'smart',
        nodes: {
          smart: { resourceType: 'smart_folder' },
        },
      })
    ).toEqual([]);
  });
});

describe('refreshSidebarResourceChildren', () => {
  beforeEach(() => {
    mockedFetchChildren.mockReset();
    mockedGetState.mockReset();
  });

  it('expands a missing folder, reloads children, and notifies the folder list', async () => {
    const expandPathTo = jest.fn().mockResolvedValue(undefined);
    const refreshChildren = jest.fn();
    const fire = jest.fn();
    const children = [{ id: 'moved' }];
    mockedGetState.mockReturnValue(
      createStore({
        expandPathTo,
        refreshChildren,
      }) as never
    );
    mockedFetchChildren.mockResolvedValue(children as never);

    await refreshSidebarResourceChildren({
      app: { fire },
      namespaceId: 'namespace',
      resourceId: 'folder-b',
    });

    expect(expandPathTo).toHaveBeenCalledWith('folder-b', {
      expandTarget: true,
    });
    expect(refreshChildren).toHaveBeenCalledWith('folder-b', children);
    expect(fire).toHaveBeenCalledWith(
      'batch_move_resource_children_changed',
      'folder-b'
    );
  });

  it('notifies the folder list even when the children request fails', async () => {
    const fire = jest.fn();
    mockedGetState.mockReturnValue(
      createStore({
        nodes: { 'folder-b': { resourceType: 'folder' } },
      }) as never
    );
    mockedFetchChildren.mockRejectedValue(new Error('network'));

    await expect(
      refreshSidebarResourceChildren({
        app: { fire },
        namespaceId: 'namespace',
        resourceId: 'folder-b',
      })
    ).rejects.toThrow('network');

    expect(fire).toHaveBeenCalledWith(
      'batch_move_resource_children_changed',
      'folder-b'
    );
  });
});
