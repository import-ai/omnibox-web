import { http } from '@/lib/request';

import {
  fetchChildren,
  fetchRootResources,
  initializeManualSort,
  updateManualSort,
} from './resource';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const get = jest.mocked(http.get);
const post = jest.mocked(http.post);
const put = jest.mocked(http.put);

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
});

it('initializes and updates manual resource sorting', async () => {
  post.mockResolvedValue({});
  put.mockResolvedValue(undefined);

  await initializeManualSort(
    'namespace',
    'root',
    { sort_by: 'title', sort_order: 'asc' },
    true
  );
  await updateManualSort('namespace', {
    root_resource_id: 'root',
    resource_id: 'resource-2',
    target_parent_id: 'folder',
    orders: [
      { parent_id: 'root', resource_ids: ['resource-1'] },
      { parent_id: 'folder', resource_ids: ['resource-2'] },
    ],
  });

  expect(post).toHaveBeenCalledWith(
    '/namespaces/namespace/resources/root/manual-sort',
    { sort_by: 'title', sort_order: 'asc', overwrite: true }
  );
  expect(put).toHaveBeenCalledWith(
    '/namespaces/namespace/resources/manual-sort',
    {
      root_resource_id: 'root',
      resource_id: 'resource-2',
      target_parent_id: 'folder',
      orders: [
        { parent_id: 'root', resource_ids: ['resource-1'] },
        { parent_id: 'folder', resource_ids: ['resource-2'] },
      ],
    }
  );
});

it('sends resource sorting to root and children endpoints', async () => {
  get.mockResolvedValue({});
  const sort = { sort_by: 'title', sort_order: 'asc' } as const;
  const rootSorts = {
    private: sort,
    teamspace: { sort_by: 'manual', sort_order: 'asc' } as const,
  };

  await fetchRootResources('namespace', { mute: true }, rootSorts);
  await fetchChildren('namespace', 'folder', sort, { mute: true });

  expect(get).toHaveBeenNthCalledWith(1, '/namespaces/namespace/root', {
    mute: true,
    params: {
      private_sort_by: 'title',
      private_sort_order: 'asc',
      teamspace_sort_by: 'manual',
      teamspace_sort_order: 'asc',
    },
  });
  expect(get).toHaveBeenNthCalledWith(
    2,
    '/namespaces/namespace/resources/folder/children',
    { mute: true, params: sort }
  );
});
