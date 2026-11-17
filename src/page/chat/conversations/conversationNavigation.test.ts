/** @jest-environment jsdom */

import { http } from '@/lib/request';
import {
  readProvisionalConversations,
  rememberProvisionalConversation,
} from '@/page/chat/conversations/provisionalConversation';

import {
  adjacentConversationId,
  clearDeletedConversationState,
  forgetConversationFromOrder,
  rememberConversationOrder,
  resolveAdjacentConversationId,
} from './conversationNavigation';

jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

const get = jest.mocked(http.get);

beforeEach(() => {
  get.mockReset();
  localStorage.setItem('uid', 'user-a');
});

it('prefers the next conversation and falls back to the previous one', () => {
  expect(adjacentConversationId(['new', 'current', 'old'], 'current')).toBe(
    'old'
  );
  expect(adjacentConversationId(['new', 'current'], 'current')).toBe('new');
  expect(adjacentConversationId(['current'], 'current')).toBeNull();
  expect(adjacentConversationId(['new', 'old'], 'current')).toBeNull();
});

it('uses the loaded conversation order without another request', async () => {
  rememberConversationOrder(
    'space-a',
    [{ id: 'new' }, { id: 'current' }, { id: 'old' }],
    true
  );

  await expect(
    resolveAdjacentConversationId('space-a', 'current')
  ).resolves.toBe('old');
  expect(get).not.toHaveBeenCalled();
});

it('loads the next page when an incomplete cached order ends at current', async () => {
  rememberConversationOrder('space-a-page', [{ id: 'new' }, { id: 'current' }]);
  get
    .mockResolvedValueOnce({
      total: 3,
      data: [{ id: 'new' }, { id: 'current' }],
    })
    .mockResolvedValueOnce({
      total: 3,
      data: [{ id: 'old' }],
    });

  await expect(
    resolveAdjacentConversationId('space-a-page', 'current')
  ).resolves.toBe('old');
  expect(get).toHaveBeenCalledTimes(2);
  expect(get).toHaveBeenLastCalledWith(
    '/namespaces/space-a-page/conversations?offset=2&limit=100&order=desc',
    { mute: true, timeout: 5000 }
  );
});

it('uses a complete cached order to fall back to the previous conversation', async () => {
  rememberConversationOrder(
    'space-a-complete',
    [{ id: 'new' }, { id: 'current' }],
    true
  );

  await expect(
    resolveAdjacentConversationId('space-a-complete', 'current')
  ).resolves.toBe('new');
  expect(get).not.toHaveBeenCalled();
});

it('falls back to the cached previous conversation when loading more fails', async () => {
  rememberConversationOrder('space-a-fallback', [
    { id: 'new' },
    { id: 'current' },
  ]);
  get.mockRejectedValueOnce(new Error('Network error'));

  await expect(
    resolveAdjacentConversationId('space-a-fallback', 'current')
  ).resolves.toBe('new');
});

it('loads later pages when the current conversation is not in the snapshot', async () => {
  rememberConversationOrder('space-b', [{ id: 'new' }]);
  get
    .mockResolvedValueOnce({
      total: 3,
      data: [{ id: 'new' }, { id: 'middle' }],
    })
    .mockResolvedValueOnce({
      total: 3,
      data: [{ id: 'old' }],
    });

  await expect(resolveAdjacentConversationId('space-b', 'old')).resolves.toBe(
    'middle'
  );
  expect(get).toHaveBeenLastCalledWith(
    '/namespaces/space-b/conversations?offset=2&limit=100&order=desc',
    { mute: true, timeout: 5000 }
  );
});

it('removes a deleted conversation from the loaded order', async () => {
  rememberConversationOrder('space-c', [
    { id: 'new' },
    { id: 'current' },
    { id: 'old' },
  ]);
  forgetConversationFromOrder('space-c', 'current');
  get.mockResolvedValueOnce({ total: 0, data: [] });

  await expect(
    resolveAdjacentConversationId('space-c', 'current')
  ).resolves.toBe(null);
  expect(get).toHaveBeenCalledTimes(1);
});

it('clears provisional and cached order data when the conversation is deleted', async () => {
  const scope = { userId: 'user-a', namespaceId: 'space-d' };
  rememberProvisionalConversation(scope, {
    id: 'current',
    title: 'Delete me',
    created_at: '2026-11-16T00:00:00.000Z',
  });
  rememberConversationOrder(
    'space-d',
    [{ id: 'current' }, { id: 'old' }],
    true
  );
  get.mockResolvedValueOnce({ total: 0, data: [] });

  clearDeletedConversationState('space-d', 'current');

  expect(readProvisionalConversations(scope)).toEqual([]);
  await expect(
    resolveAdjacentConversationId('space-d', 'current')
  ).resolves.toBeNull();
  expect(get).toHaveBeenCalledTimes(1);
});

it('falls back to the cached previous conversation when the deleted current item disappears from the API', async () => {
  rememberConversationOrder('space-missing-current', [
    { id: 'previous' },
    { id: 'current' },
  ]);
  get.mockResolvedValueOnce({
    total: 2,
    data: [{ id: 'previous' }, { id: 'unrelated' }],
  });

  await expect(
    resolveAdjacentConversationId('space-missing-current', 'current')
  ).resolves.toBe('previous');
});

it('does not overwrite a newer order when an older request resolves', async () => {
  rememberConversationOrder('space-stale-order', [{ id: 'current' }]);
  let resolveOrder!: (value: { total: number; data: { id: string }[] }) => void;
  get.mockReturnValueOnce(
    new Promise(resolve => {
      resolveOrder = resolve;
    })
  );
  const pending = resolveAdjacentConversationId('space-stale-order', 'current');

  rememberConversationOrder(
    'space-stale-order',
    [{ id: 'newer' }, { id: 'target' }],
    true
  );
  resolveOrder({
    total: 2,
    data: [{ id: 'current' }, { id: 'stale-target' }],
  });

  await expect(pending).resolves.toBe('stale-target');
  await expect(
    resolveAdjacentConversationId('space-stale-order', 'newer')
  ).resolves.toBe('target');
  expect(get).toHaveBeenCalledTimes(1);
});

it('keeps an in-flight order scoped to the user who requested it', async () => {
  let resolveOrder!: (value: { total: number; data: { id: string }[] }) => void;
  get.mockReturnValueOnce(
    new Promise(resolve => {
      resolveOrder = resolve;
    })
  );
  const pending = resolveAdjacentConversationId('space-user-scope', 'current');

  localStorage.setItem('uid', 'user-b');
  resolveOrder({
    total: 3,
    data: [{ id: 'current' }, { id: 'next' }, { id: 'previous' }],
  });
  await expect(pending).resolves.toBe('next');

  get.mockResolvedValueOnce({ total: 0, data: [] });
  await expect(
    resolveAdjacentConversationId('space-user-scope', 'current')
  ).resolves.toBeNull();
  expect(get).toHaveBeenCalledTimes(2);
});

it('prefers the refreshed order when an older request resolves during deletion', async () => {
  rememberConversationOrder('space-refreshed-order', [{ id: 'current' }]);
  let resolveOrder!: (value: { total: number; data: { id: string }[] }) => void;
  get.mockReturnValueOnce(
    new Promise(resolve => {
      resolveOrder = resolve;
    })
  );
  const pending = resolveAdjacentConversationId(
    'space-refreshed-order',
    'current'
  );

  rememberConversationOrder(
    'space-refreshed-order',
    [{ id: 'current' }, { id: 'fresh-target' }],
    true
  );
  resolveOrder({
    total: 2,
    data: [{ id: 'current' }, { id: 'stale-target' }],
  });

  await expect(pending).resolves.toBe('fresh-target');
});
