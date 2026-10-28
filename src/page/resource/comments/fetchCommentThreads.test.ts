import type { ResourceCommentThread } from '@/interface';
import { listResourceCommentThreads } from '@/service/resourceComments';

import {
  COMMENT_REFRESH_PAGE_SIZE,
  fetchAllResourceCommentThreads,
  replaceThreadsForFilter,
} from './fetchCommentThreads';

jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
}));

function thread(id: string, resolved = false): ResourceCommentThread {
  return { id, resolved } as ResourceCommentThread;
}

describe('fetchAllResourceCommentThreads', () => {
  it('pages through every thread for the active filter', async () => {
    jest
      .mocked(listResourceCommentThreads)
      .mockResolvedValueOnce({
        items: [thread('a')],
        total: 2,
        offset: 0,
        limit: COMMENT_REFRESH_PAGE_SIZE,
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [thread('b')],
        total: 2,
        offset: 1,
        limit: COMMENT_REFRESH_PAGE_SIZE,
        has_more: false,
      });

    await expect(
      fetchAllResourceCommentThreads('namespace', 'resource', false)
    ).resolves.toEqual([thread('a'), thread('b')]);
    expect(listResourceCommentThreads).toHaveBeenNthCalledWith(
      1,
      'namespace',
      'resource',
      { offset: 0, limit: COMMENT_REFRESH_PAGE_SIZE, resolved: false }
    );
    expect(listResourceCommentThreads).toHaveBeenNthCalledWith(
      2,
      'namespace',
      'resource',
      { offset: 1, limit: COMMENT_REFRESH_PAGE_SIZE, resolved: false }
    );
  });
});

describe('replaceThreadsForFilter', () => {
  it('replaces every thread when the filter is all comments', () => {
    expect(
      replaceThreadsForFilter(
        [thread('old', false)],
        [thread('fresh', true)],
        undefined
      )
    ).toEqual([thread('fresh', true)]);
  });

  it('replaces only the active filter and keeps the other group', () => {
    expect(
      replaceThreadsForFilter(
        [thread('open-old', false), thread('resolved', true)],
        [thread('open-new', false)],
        false
      )
    ).toEqual([thread('resolved', true), thread('open-new', false)]);
  });
});
