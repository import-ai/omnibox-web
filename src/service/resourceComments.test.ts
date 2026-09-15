import { http } from '@/lib/request';

import { listResourceCommentThreads } from './resourceComments';

jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

describe('comment pagination API', () => {
  it.each([
    ['namespace', '/namespaces/namespace/resources/resource/comment-threads'],
    ['share:shared', '/shares/shared/resources/resource/comment-threads'],
  ])('sends canonical pagination on %s', async (namespaceId, url) => {
    const response = {
      items: [],
      total: 23,
      offset: 20,
      limit: 2,
      has_more: true,
    };
    jest.mocked(http.get).mockResolvedValueOnce(response);
    await expect(
      listResourceCommentThreads(namespaceId, 'resource', {
        offset: 20,
        limit: 2,
        resolved: false,
      })
    ).resolves.toEqual(response);
    expect(http.get).toHaveBeenLastCalledWith(url, {
      params: { offset: 20, limit: 2, resolved: 'false' },
    });
  });
});
