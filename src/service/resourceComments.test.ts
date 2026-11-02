import { http } from '@/lib/request';

import * as comments from './resourceComments';

const { listResourceCommentThreads } = comments;

jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));

describe('comment pagination API', () => {
  it.each(['inline', 'sidebar', 'document'] as const)(
    'sends the %s collection view',
    async view => {
      await listResourceCommentThreads('namespace', 'resource', {
        view,
        resolved: false,
      } as Parameters<typeof listResourceCommentThreads>[2]);
      expect(http.get).toHaveBeenLastCalledWith(
        '/namespaces/namespace/resources/resource/comment-threads',
        { params: { offset: 0, limit: 20, resolved: 'false', view } }
      );
    }
  );

  it.each([
    [
      'namespace',
      '/namespaces/namespace/resources/resource/comment-threads/target',
    ],
    [
      'share:shared',
      '/shares/shared/resources/resource/comment-threads/target',
    ],
  ])(
    'looks up a single thread in its %s scope without automatic error toasts',
    async (namespaceId, url) => {
      const lookup = (
        comments as unknown as {
          getResourceCommentThread: (
            namespace: string,
            resource: string,
            thread: string
          ) => Promise<unknown>;
        }
      ).getResourceCommentThread;
      await lookup(namespaceId, 'resource', 'target');
      expect(http.get).toHaveBeenLastCalledWith(url, { mute: true });
    }
  );

  it('posts an anchor-free document comment', async () => {
    await comments.createResourceCommentThread('namespace', 'resource', {
      type: 'document',
      content: 'A document comment',
      attachment_ids: ['image'],
    } as unknown as Parameters<typeof comments.createResourceCommentThread>[2]);
    expect(http.post).toHaveBeenLastCalledWith(
      '/namespaces/namespace/resources/resource/comment-threads',
      {
        type: 'document',
        content: 'A document comment',
        attachment_ids: ['image'],
      },
      { muteCodes: ['resource_content_conflict'] }
    );
  });
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
