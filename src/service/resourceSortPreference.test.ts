import { http } from '@/lib/request';

import {
  fetchResourceSortPreferences,
  updateResourceSortPreference,
} from './resourceSortPreference';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), put: jest.fn() },
}));

const get = jest.mocked(http.get);
const put = jest.mocked(http.put);

beforeEach(() => {
  get.mockReset();
  put.mockReset();
});

it('fetches and updates namespace-scoped sort preferences', async () => {
  const preferences = {
    private: {
      space_type: 'private' as const,
      sort_by: 'title' as const,
      sort_order: 'asc' as const,
    },
    teamspace: {
      space_type: 'teamspace' as const,
      sort_by: 'updated_at' as const,
      sort_order: 'desc' as const,
    },
  };
  get.mockResolvedValue(preferences);
  put.mockResolvedValue(preferences.private);

  await expect(
    fetchResourceSortPreferences('namespace', { mute: true })
  ).resolves.toBe(preferences);
  await updateResourceSortPreference('namespace', 'private', {
    sort_by: 'title',
    sort_order: 'asc',
  });

  expect(get).toHaveBeenCalledWith(
    '/namespaces/namespace/resource-sort-preferences',
    { mute: true }
  );
  expect(put).toHaveBeenCalledWith(
    '/namespaces/namespace/resource-sort-preferences',
    {
      space_type: 'private',
      sort_by: 'title',
      sort_order: 'asc',
    }
  );
});
