import type { SpaceType } from '@/interface';
import { fetchChildren, fetchSmartFolderChildren } from '@/service/resource';
import { RSS_ITEM_SORT } from '@/service/resourceSort';

import {
  fetchChildrenForSidebarRefresh,
  getExpandedNodeIdsForSidebarRefresh,
} from './sidebarBehavior';
import type { TreeNode } from './store';

jest.mock('@/service/resource', () => ({
  fetchChildren: jest.fn(),
  fetchSmartFolderChildren: jest.fn(),
}));

const mockedFetchChildren = jest.mocked(fetchChildren);
const mockedFetchSmartFolderChildren = jest.mocked(fetchSmartFolderChildren);

function node(resourceType: TreeNode['resourceType']): TreeNode {
  return {
    id: 'rss-folder',
    parentId: 'private',
    spaceType: 'private' as SpaceType,
    name: 'RSS folder',
    resourceType,
    hasChildren: true,
    readOnly: false,
    manualSortInitializedAt: null,
    createdAt: '',
    updatedAt: '',
    children: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('refreshes RSS folder children newest-published first', async () => {
  const children = [{ id: 'item-1' }];
  mockedFetchChildren.mockResolvedValue(children as never);

  await expect(
    fetchChildrenForSidebarRefresh('namespace', node('rss_folder'), {
      sort_by: 'title',
      sort_order: 'asc',
    })
  ).resolves.toEqual(children);
  expect(mockedFetchChildren).toHaveBeenCalledWith(
    'namespace',
    'rss-folder',
    RSS_ITEM_SORT
  );
  expect(mockedFetchSmartFolderChildren).not.toHaveBeenCalled();
});

it('keeps the space sort for regular folders', async () => {
  mockedFetchChildren.mockResolvedValue([] as never);
  const sort = { sort_by: 'title', sort_order: 'asc' } as const;

  await fetchChildrenForSidebarRefresh('namespace', node('folder'), sort);

  expect(mockedFetchChildren).toHaveBeenCalledWith(
    'namespace',
    'rss-folder',
    sort
  );
});

it('includes an expanded RSS folder in the refresh snapshot', () => {
  const rssFolder = node('rss_folder');
  const nodes = { [rssFolder.id]: rssFolder };
  const rootIds = { private: 'private', teamspace: '' };
  const ui = {
    [rssFolder.id]: { expanded: true, loading: false, loaded: true },
  };

  expect(getExpandedNodeIdsForSidebarRefresh(nodes, ui, rootIds)).toEqual([
    rssFolder.id,
  ]);
});
