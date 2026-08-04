import type { SpaceType } from '@/interface';
import { fetchChildren, fetchSmartFolderChildren } from '@/service/resource';

import {
  fetchChildrenForSidebarRefresh,
  getExpandedNodeIdsForSidebarRefresh,
  isCurrentRssItemRoute,
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
    createdAt: '',
    updatedAt: '',
    children: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('does not request resource children when refreshing an RSS folder', async () => {
  await expect(
    fetchChildrenForSidebarRefresh('namespace', node('rss_folder'))
  ).resolves.toBeNull();
  expect(mockedFetchChildren).not.toHaveBeenCalled();
  expect(mockedFetchSmartFolderChildren).not.toHaveBeenCalled();
});

it('keeps an expanded RSS folder in consecutive refresh snapshots', () => {
  const rssFolder = node('rss_folder');
  rssFolder.hasChildren = false;
  const nodes = { [rssFolder.id]: rssFolder };
  const rootIds = { private: 'private', teamspace: '' };
  const ui = {
    [rssFolder.id]: { expanded: true, loading: false, loaded: true },
  };

  expect(getExpandedNodeIdsForSidebarRefresh(nodes, ui, rootIds)).toEqual([
    rssFolder.id,
  ]);

  ui[rssFolder.id].loaded = false;

  expect(getExpandedNodeIdsForSidebarRefresh(nodes, ui, rootIds)).toEqual([
    rssFolder.id,
  ]);
});

it('recognizes the current RSS item route for locate', () => {
  expect(
    isCurrentRssItemRoute(
      '/namespace/rss-folder/rss-items/item',
      'namespace',
      'rss-folder'
    )
  ).toBe(true);
  expect(
    isCurrentRssItemRoute('/namespace/rss-folder', 'namespace', 'rss-folder')
  ).toBe(false);
});
